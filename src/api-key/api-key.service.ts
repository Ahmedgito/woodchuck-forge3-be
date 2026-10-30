import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  randomBytes,
  createHmac,
  createCipheriv,
  createDecipheriv,
} from 'crypto';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly configService: ConfigService,
  ) {}

  private getPepper(): string {
    const pepper = this.configService.get<string>('auth.apiKeyPepper', {
      infer: true,
    } as any);
    if (!pepper) throw new Error('API_KEY_PEPPER is not set');
    return pepper;
  }

  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>(
      'auth.apiKeyEncryptionKeyBase64',
      {
        infer: true,
      } as any,
    );
    if (!key) throw new Error('API_KEY_ENCRYPTION_KEY is not set');
    const buf = Buffer.from(key, 'base64');
    if (buf.length !== 32)
      throw new Error('API_KEY_ENCRYPTION_KEY must be 32 bytes base64');
    return buf;
  }

  private hashApiKey(rawKey: string): string {
    const pepper = this.getPepper();
    return createHmac('sha256', pepper).update(rawKey).digest('base64');
  }

  private encrypt(rawKey: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(12); // GCM 96-bit IV
    const cipher = createCipheriv(
      'aes-256-gcm',
      key as unknown as import('crypto').CipherKey,
      iv as unknown as import('crypto').BinaryLike,
    );
    const part1 = cipher.update(rawKey, 'utf8') as any;
    const part2 = cipher.final() as any;
    const ciphertext = Buffer.concat([part1, part2] as any);
    const authTag = cipher.getAuthTag();
    // Store as base64url: iv|tag|ciphertext
    return Buffer.concat([iv, authTag, ciphertext] as any).toString(
      'base64url',
    );
  }

  private decrypt(payload: string): string {
    const key = this.getEncryptionKey();
    const buf = Buffer.from(payload, 'base64url');
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key as unknown as import('crypto').CipherKey,
      iv as unknown as import('crypto').BinaryLike,
    );
    decipher.setAuthTag(authTag as any);
    const d1 = decipher.update(new Uint8Array(ciphertext as any)) as any;
    const d2 = decipher.final() as any;
    const plain = Buffer.concat([d1, d2] as any);
    return plain.toString('utf8');
  }

  async generateAndStoreKey(userId: number): Promise<string> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const rawKey = randomBytes(32).toString('base64url');
    const api_key_hash = this.hashApiKey(rawKey);
    const api_key_encrypted = this.encrypt(rawKey);
    await this.usersRepo.update(userId, {
      api_key_hash,
      api_key_encrypted,
      api_key_created_at: new Date(),
      api_key_revoked: false,
    });
    return rawKey;
  }

  async validateApiKey(rawKey: string): Promise<{ id: number } | null> {
    if (!rawKey) return null;
    const hash = this.hashApiKey(rawKey);
    const user = await this.usersRepo.findOne({
      where: { api_key_hash: hash, api_key_revoked: false },
      select: ['id'],
    });
    if (!user) return null;
    return { id: user.id };
  }

  async getUserKey(userId: number): Promise<{ apiKey: string } | null> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'api_key_encrypted'],
    });
    if (!user || !user.api_key_encrypted) return null;
    const apiKey = this.decrypt(user.api_key_encrypted);
    return { apiKey };
  }

  async getCo2TrueUserKey(): Promise<{ apiKey: string } | null> {
    const user = await this.usersRepo.findOne({
      where: { isApiOnly: true },
      order: { id: 'ASC' },
      select: ['id', 'api_key_encrypted'],
    });
    if (!user || !user.api_key_encrypted) return null;

    return {
      apiKey: this.decrypt(user.api_key_encrypted),
    };
  }

  async refreshApiKey(userId: number): Promise<{ apiKey: string }> {
    const apiKey = await this.generateAndStoreKey(userId);
    return { apiKey };
  }

  async userHasApiKey(userId: number): Promise<boolean> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'api_key_hash', 'api_key_encrypted'],
    });
    return Boolean(user?.api_key_hash && user?.api_key_encrypted);
  }
}
