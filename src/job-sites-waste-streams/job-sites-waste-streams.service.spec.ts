import { Test, TestingModule } from '@nestjs/testing';
import { JobSitesWasteStreamsService } from './job-sites-waste-streams.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobSitesWasteStreamsEntity } from './infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSiteWastestreamsDumpstersEntity } from '../job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { JobSiteEntity } from '../job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSitesCamerasEntity } from '../job-sites-cameras/infrastructure/persistence/relational/entities/job-sites-cameras.entity';
import { WasteStreamCamerasEntity } from '../wastestream-cameras/infrastructure/persistence/relational/entities/wastestream-cameras.entity';
import { JobsiteWasteStreamLocationsEntity } from '../job-site-waste-stream-locations/infrastructure/persistence/relational/entities/job-site-waste-stream-locations.entity';
import { WasteStreamsEntity } from '../wastestreams/infrastructure/persistence/relational/entities/wastestreams.entity';
import { WasteStreamTypesEntity } from '../wastestream-types/infrastructure/persistence/relational/entities/wastestream-types.entity';
import { VesselEntity } from '../vessels/infrastructure/persistence/relational/entities/vessel.entity';
import { ConfigService } from '@nestjs/config';
import { EmissionFactorsService } from '../emission-factors/emission-factors.service';
import { RoleEnum } from '../roles/roles.enum';
import { LocationsTypeEnum } from '../locations/locationTypes.enum';
import { PowerPlantsEntity } from '../power-plants/infrastructure/persistence/relational/entities/power-plants.entity';
import { JobSiteStats } from './utils/job-sites-stats';
import { WasteStreamImageEntity } from '../waste-stream-images/infrastructure/persistence/relational/entities/waste-stream-image.entity';

describe('JobSitesWasteStreamsService - getMapDataForUser', () => {
  let service: JobSitesWasteStreamsService;
  let jobSitesRepository: any;
  let jobSitesWasteStreamsRepository: any;
  let emissionFactorsService: any;
  let mockQueryBuilder: any;

  const mockUser = {
    id: 1,
    role: { id: RoleEnum.general_contractor, name: 'General Contractor' },
    isSubUser: false,
    parentUserId: null,
  };

  const mockJobSite = {
    id: 1,
    title: 'Test Job Site',
    address: {
      addressFull: '123 Main St, City, State',
      addressLine1: '123 Main St',
      addressLine2: null,
      city: 'City',
      state: 'State',
      postalCode: '12345',
      country: 'US',
      lat: 40.7128,
      lng: -74.006,
      placeId: 'test-place-id',
    },
    jobSiteDetails: {
      sustainabilityGoal: 75,
    },
    client: { id: 1 },
  };

  const mockWasteStream = {
    id: 1,
    name: 'Wood Waste',
  };

  const mockDumpster = {
    id: 1,
    real_weight: 10.5,
    estimated_weight: 10.0,
    creationDate: new Date('2024-01-15'),
  };

  const mockProcessingLocation = {
    id: 1,
    type: 1, // Processing location
    distance: 25.5,
    locationId: 1,
    powerplantId: null,
    location: {
      id: 1,
      name: 'Processing Facility',
      type: LocationsTypeEnum.Recycling, // Using Recycling as processing facility
      address: {
        addressFull: '456 Processing Ave, City, State',
        addressLine1: '456 Processing Ave',
        addressLine2: null,
        city: 'City',
        state: 'State',
        postalCode: '12346',
        country: 'US',
        lat: 40.7228,
        lng: -74.016,
      },
    },
    powerplant: null,
  };

  const mockEndLocation = {
    id: 2,
    type: 2, // End location
    distance: 15.0,
    locationId: null,
    powerplantId: 1,
    location: null,
    powerplant: {
      id: 1,
      name: 'Power Plant',
      address: {
        addressFull: '789 Power St, City, State',
        addressLine1: '789 Power St',
        addressLine2: null,
        city: 'City',
        state: 'State',
        postalCode: '12347',
        country: 'US',
        lat: 40.7328,
        lng: -74.026,
      },
    },
  };

  const mockJobSiteWasteStream = {
    id: 1,
    dumpster_key: '20_yard_offroll',
    dumpster_weight: null,
    wasteStream: mockWasteStream,
    jobSitesWasteStreamsDumpsters: [mockDumpster],
    wasteStreamLocations: [mockProcessingLocation, mockEndLocation],
    jobSite: mockJobSite,
    // Populated by the entity's @AfterLoad hook in production; plain fixture
    // objects never run it, so set it explicitly.
    jobSiteId: mockJobSite.id,
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      withDeleted: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ wsId: '1', totalWeight: '10.5', moved: '1' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobSitesWasteStreamsService,
        {
          provide: getRepositoryToken(JobSitesWasteStreamsEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(JobSiteWastestreamsDumpstersEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JobSiteEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JobSitesCamerasEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WasteStreamCamerasEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JobsiteWasteStreamLocationsEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WasteStreamsEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WasteStreamTypesEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VesselEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: EmissionFactorsService,
          useValue: {
            findByKey: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PowerPlantsEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WasteStreamImageEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: JobSiteStats,
          useValue: {
            getWoodWasteTransportCo2: jest.fn().mockResolvedValue(0),
            woodWaste: jest.fn().mockResolvedValue([]),
            getWoodWasteDistance2: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<JobSitesWasteStreamsService>(
      JobSitesWasteStreamsService,
    );
    jobSitesRepository = module.get(getRepositoryToken(JobSiteEntity));
    jobSitesWasteStreamsRepository = module.get(
      getRepositoryToken(JobSitesWasteStreamsEntity),
    );
    emissionFactorsService = module.get(EmissionFactorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMapDataForUser', () => {
    it('should return empty data when no job sites found', async () => {
      jobSitesRepository.find.mockResolvedValue([]);

      const result = await service.getMapDataForUser(mockUser as any);

      expect(result).toEqual({
        wasteStreams: [],
        locations: [],
        jobSites: [],
      });
    });

    it('should return map data with totalTonnage, totalDistance, and totalCo2Avoided', async () => {
      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        mockJobSiteWasteStream,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined, // startDate
        undefined, // endDate
        undefined, // jobSiteId
        undefined, // wasteType
        undefined, // materialDestinations
        true, // includeStats
      );

      expect(result).toHaveProperty('wasteStreams');
      expect(result).toHaveProperty('locations');
      expect(result).toHaveProperty('jobSites');
      expect(result).toHaveProperty('totalTonnage');
      expect(result).toHaveProperty('totalDistance');
      expect(result).toHaveProperty('totalCo2Avoided');

      expect(result.totalTonnage).toBeGreaterThanOrEqual(0);
      expect(result.totalDistance).toBeGreaterThanOrEqual(0);
      expect(result.totalCo2Avoided).toBeGreaterThanOrEqual(0);
    });

    it('should calculate totalTonnage correctly', async () => {
      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        mockJobSiteWasteStream,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined, // startDate
        undefined, // endDate
        undefined, // jobSiteId
        undefined, // wasteType
        undefined, // materialDestinations
        true, // includeStats
      );

      // Total tonnage should be the sum of all dumpster weights
      expect(result.totalTonnage).toBe(10.5); // From mockDumpster.real_weight
    });

    it('should calculate totalDistance correctly', async () => {
      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        mockJobSiteWasteStream,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined, // startDate
        undefined, // endDate
        undefined, // jobSiteId
        undefined, // wasteType
        undefined, // materialDestinations
        true, // includeStats
      );

      // Total distance should be sum of processing (25.5) + end (15.0) = 40.5
      expect(result.totalDistance).toBe(40.5);
    });

    it('should calculate totalCo2Avoided from diverted tonnage', async () => {
      // Diversion requires the processing leg to reach a power plant (or a
      // location that is neither Landfill nor Recycling).
      const powerplantProcessingLocation = {
        ...mockProcessingLocation,
        location: null,
        locationId: null,
        powerplantId: 1,
      };
      const divertedWasteStream = {
        ...mockJobSiteWasteStream,
        wasteStreamLocations: [powerplantProcessingLocation, mockEndLocation],
      };

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        divertedWasteStream,
      ]);

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined, // startDate
        undefined, // endDate
        undefined, // jobSiteId
        undefined, // wasteType
        undefined, // materialDestinations
        true, // includeStats
      );

      // 10.5 diverted tons * 1.65 = 17.33, rounded to 17. Transport CO2 is 0
      // because no date range was supplied.
      expect(result.totalCo2Avoided).toBe(17);
    });

    it('should report no CO2 avoided when nothing is diverted', async () => {
      // The default fixture's processing leg is a Recycling location with no
      // power plant, which does not count as diverted.
      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        mockJobSiteWasteStream,
      ]);

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined, // startDate
        undefined, // endDate
        undefined, // jobSiteId
        undefined, // wasteType
        undefined, // materialDestinations
        true, // includeStats
      );

      expect(result.totalCo2Avoided).toBe(0);
    });

    it('should filter waste streams by date range when provided', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        mockJobSiteWasteStream,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        startDate,
        endDate,
      );

      expect(result).toBeDefined();
      expect(result.jobSites).toBeDefined();
    });

    it('should filter out waste streams with 0 tons', async () => {
      const mockEmptyDumpster = {
        ...mockDumpster,
        real_weight: 0,
        estimated_weight: 0,
      };

      const mockZeroTonWasteStream = {
        ...mockJobSiteWasteStream,
        jobSitesWasteStreamsDumpsters: [mockEmptyDumpster],
      };

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        mockZeroTonWasteStream,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });
      // Override aggregate to return 0 weight so the waste stream is filtered out
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        { wsId: '1', totalWeight: '0', moved: '1' },
      ]);

      const result: any = await service.getMapDataForUser(mockUser as any);

      // Job site should be filtered out because all waste streams have 0 tons
      expect(result.jobSites).toHaveLength(0);
    });

    it('should handle sub-users by using parent user ID', async () => {
      const subUser = {
        ...mockUser,
        isSubUser: true,
        parentUserId: 999,
      };

      jobSitesRepository.find.mockResolvedValue([]);

      await service.getMapDataForUser(subUser as any);

      expect(jobSitesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            client: { id: 999 },
          }),
        }),
      );
    });

    it('should filter by specific jobSiteId when provided', async () => {
      const jobSiteId = 5;

      jobSitesRepository.find.mockResolvedValue([]);

      await service.getMapDataForUser(
        mockUser as any,
        undefined,
        undefined,
        jobSiteId,
      );

      expect(jobSitesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: jobSiteId,
          }),
        }),
      );
    });

    it('should include locations only for processing and end locations', async () => {
      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        mockJobSiteWasteStream,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(mockUser as any);

      expect(result.locations).toHaveLength(2); // Processing facility + Power plant
      expect(result.locations[0]).toHaveProperty('entryType', 'location');
      expect(result.locations[1]).toHaveProperty('entryType', 'powerplant');
    });

    it('should extract unique waste stream names', async () => {
      const multipleWasteStreams = [
        mockJobSiteWasteStream,
        {
          ...mockJobSiteWasteStream,
          id: 2,
          wasteStream: { id: 2, name: 'Metal Waste' },
        },
        {
          ...mockJobSiteWasteStream,
          id: 3,
          wasteStream: { id: 1, name: 'Wood Waste' }, // Duplicate name
        },
      ];

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue(
        multipleWasteStreams,
      );
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(mockUser as any);

      // Should have 2 unique waste stream names: "Wood Waste" and "Metal Waste"
      expect(result.wasteStreams).toHaveLength(2);
      const wasteStreamNames = result.wasteStreams.map((ws: any) => ws.name);
      expect(wasteStreamNames).toContain('Wood Waste');
      expect(wasteStreamNames).toContain('Metal Waste');
    });

    it('should count landfill tonnage in the total', async () => {
      // Landfill was deliberately re-included in map totals — see the
      // "added landfilll back to the map" note in calculateWasteStreamTons.
      const landfillLocation = {
        ...mockProcessingLocation,
        location: {
          ...mockProcessingLocation.location,
          type: LocationsTypeEnum.Landfill,
        },
      };

      const wasteStreamToLandfill = {
        ...mockJobSiteWasteStream,
        wasteStreamLocations: [landfillLocation],
      };

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        wasteStreamToLandfill,
      ]);

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined, // startDate
        undefined, // endDate
        undefined, // jobSiteId
        undefined, // wasteType
        undefined, // materialDestinations
        true, // includeStats
      );

      expect(result.totalTonnage).toBe(10.5);
    });

    it('should work for manufacturer role', async () => {
      const manufacturerUser = {
        ...mockUser,
        role: { id: RoleEnum.manufacturer, name: 'Manufacturer' },
      };

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        mockJobSiteWasteStream,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        manufacturerUser as any,
      );

      expect(result).toBeDefined();
      expect(result.jobSites).toBeDefined();
    });

    it('should filter by wasteType when provided', async () => {
      const multipleWasteStreams = [
        mockJobSiteWasteStream,
        {
          ...mockJobSiteWasteStream,
          id: 2,
          wasteStream: { id: 2, name: 'Metal Waste' },
        },
      ];

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue(
        multipleWasteStreams,
      );
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined,
        undefined,
        undefined,
        'Wood Waste', // wasteType filter
      );

      // Should only include Wood Waste streams
      expect(result.wasteStreams).toHaveLength(1);
      expect(result.wasteStreams[0].name).toBe('Wood Waste');
    });

    it('should skip wasteType filter when value is "All"', async () => {
      const multipleWasteStreams = [
        mockJobSiteWasteStream,
        {
          ...mockJobSiteWasteStream,
          id: 2,
          wasteStream: { id: 2, name: 'Metal Waste' },
        },
      ];

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue(
        multipleWasteStreams,
      );
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined,
        undefined,
        undefined,
        'All', // wasteType filter with "All"
      );

      // Should include all waste streams
      expect(result.wasteStreams).toHaveLength(2);
    });

    it('should filter by powerplant when materialDestinationType is "powerplant"', async () => {
      const wasteStreamWithPowerplant = {
        ...mockJobSiteWasteStream,
        wasteStreamLocations: [mockEndLocation], // Only powerplant location
      };

      const wasteStreamWithLocation = {
        ...mockJobSiteWasteStream,
        id: 2,
        wasteStream: { id: 2, name: 'Metal Waste' },
        wasteStreamLocations: [mockProcessingLocation], // Only location, no powerplant
      };

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        wasteStreamWithPowerplant,
        wasteStreamWithLocation,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined,
        undefined,
        undefined,
        undefined, // wasteType
        [{ type: 'powerplant', id: 1 }], // materialDestinations
      );

      // Should only include waste stream with powerplant ID 1
      expect(result.wasteStreams).toHaveLength(1);
      expect(result.wasteStreams[0].name).toBe('Wood Waste');
    });

    it('should filter by location when materialDestinationType is not "powerplant"', async () => {
      const wasteStreamWithPowerplant = {
        ...mockJobSiteWasteStream,
        wasteStreamLocations: [mockEndLocation], // Only powerplant location
      };

      const wasteStreamWithLocation = {
        ...mockJobSiteWasteStream,
        id: 2,
        wasteStream: { id: 2, name: 'Metal Waste' },
        wasteStreamLocations: [mockProcessingLocation], // Only location (locationId: 1)
      };

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        wasteStreamWithPowerplant,
        wasteStreamWithLocation,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined,
        undefined,
        undefined,
        undefined, // wasteType
        [{ type: 'location', id: 1 }], // materialDestinations
      );

      // Should only include waste stream with location ID 1
      expect(result.wasteStreams).toHaveLength(1);
      expect(result.wasteStreams[0].name).toBe('Metal Waste');
    });

    it('should combine wasteType and materialDestination filters', async () => {
      const woodWasteWithPowerplant = {
        ...mockJobSiteWasteStream,
        wasteStreamLocations: [mockEndLocation], // powerplantId: 1
      };

      const metalWasteWithPowerplant = {
        ...mockJobSiteWasteStream,
        id: 2,
        wasteStream: { id: 2, name: 'Metal Waste' },
        wasteStreamLocations: [mockEndLocation], // powerplantId: 1
      };

      const woodWasteWithLocation = {
        ...mockJobSiteWasteStream,
        id: 3,
        wasteStreamLocations: [mockProcessingLocation], // locationId: 1
      };

      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        woodWasteWithPowerplant,
        metalWasteWithPowerplant,
        woodWasteWithLocation,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined,
        undefined,
        undefined,
        'Wood Waste', // wasteType filter
        [{ type: 'powerplant', id: 1 }], // materialDestinations
      );

      // Should only include Wood Waste with powerplant ID 1
      expect(result.wasteStreams).toHaveLength(1);
      expect(result.wasteStreams[0].name).toBe('Wood Waste');
    });

    it('should return empty when no waste streams match materialDestination filter', async () => {
      jobSitesRepository.find.mockResolvedValue([mockJobSite]);
      jobSitesWasteStreamsRepository.find.mockResolvedValue([
        mockJobSiteWasteStream,
      ]);
      emissionFactorsService.findByKey.mockResolvedValue({
        key: 'co2_avoided',
        value: '0.4',
      });

      const result: any = await service.getMapDataForUser(
        mockUser as any,
        undefined,
        undefined,
        undefined,
        undefined, // wasteType
        [{ type: 'powerplant', id: 999 }], // Non-existent powerplantId
      );

      // Should return empty since no powerplant with ID 999 exists
      expect(result.wasteStreams).toHaveLength(0);
      expect(result.jobSites).toHaveLength(0);
    });
  });
});
