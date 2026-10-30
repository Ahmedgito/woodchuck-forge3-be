import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenieEntity } from 'src/genie/infrastructure/persistence/relational/entities/genie.entity';

@Injectable()
export class GenieSeedService {
  constructor(
    @InjectRepository(GenieEntity)
    private repository: Repository<GenieEntity>,
  ) {}

  async run() {
    // Keep sequence in sync for environments where rows were inserted manually.
    await this.repository.query(
      `SELECT setval(
        pg_get_serial_sequence('"genie"', 'id'),
        COALESCE((SELECT MAX(id) FROM "genie"), 0) + 1,
        false
      );`,
    );

    const entries: Array<Pick<GenieEntity, 'value' | 'description'>> = [
      {
        value: 'co2e_carbon_impact',
        description: `We calculate CO2e based on the amount of wood waste diverted from landfill and its downstream use.
Instead of treating waste as disposal, we model it as material recovery and energy substitution, using established environmental conversion standards.
This reflects the true avoided emissions footprint, not just waste handling.`,
      },
      {
        value: 'transport_co2',
        description: `This captures the emissions generated from moving materials:
• From job site → processing location
• From processing → final reuse or offtake destination
We factor in distance, load efficiency, and vehicle type to estimate real-world logistics impact.`,
      },
      {
        value: 'net_co2_avoided',
        description: `This is the true environmental value:
What we prevent (by diverting waste)
minus
What we generate (through transport and handling)
It reflects the actual net benefit, not a theoretical one — this is the number that matters for ESG and carbon accounting.`,
      },
      {
        value: 'diversion_rate',
        description: `This represents the percentage of material successfully kept out of landfill.
A 100% diversion rate means:
• All tracked wood waste was recovered, reused, or processed
• No material was sent to landfill within the defined scope
This is one of the strongest indicators of circularity performance.`,
      },
      {
        value: 'mwh_energy_equivalent',
        description: `We convert processed wood volume into its energy potential equivalent.
This answers a simple executive question:
“If this material were used as energy, what would it power?”
It allows stakeholders to understand impact in familiar terms
(homes powered, energy generated) rather than raw tonnage.`,
      },
    ];

    for (const entry of entries) {
      const existing = await this.repository.findOne({
        where: { value: entry.value },
      });

      if (!existing) {
        await this.repository.save(this.repository.create(entry));
        continue;
      }

      await this.repository.update(existing.id, {
        description: entry.description,
      });
    }
  }
}
