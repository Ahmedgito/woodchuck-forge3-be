import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/users/infrastructure/persistence/user.repository';

@Injectable()
@ValidatorConstraint({ async: true })
export class IsUniqueEmailConstraint implements ValidatorConstraintInterface {
  constructor(private readonly usersRepository: UserRepository) {}

  async validate(value: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ email: value });
    return !user;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be unique`;
  }
}

export function IsUniqueEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsUniqueEmailConstraint,
    });
  };
}
