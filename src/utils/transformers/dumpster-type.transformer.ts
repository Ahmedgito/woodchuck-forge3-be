export function transformDumpsterType(dumpsterType: string) {
  const parts = dumpsterType.split('_');
  if (parts.length < 2) {
    return {
      dumpsterType: dumpsterType.toUpperCase(),
      dumpsterKey: dumpsterType.toLowerCase(),
      dumpsterWeight: null,
    };
  }

  const [key, weight] = parts;
  const dumpsterTypeMap: { [key: string]: string } = {
    frontload: 'FRONT LOAD',
    rolloff: 'ROLL OFF',
    compactor: 'COMPACTOR',
  };

  const dumpsterTypeValue =
    dumpsterTypeMap[key.toLowerCase()] || key.toUpperCase();

  return {
    dumpsterType: dumpsterTypeValue,
    dumpsterKey: key.toLowerCase(),
    dumpsterWeight: weight.toLowerCase(),
  };
}

export function transformVesselOptionType(
  vesselName: string,
  optionValue: any,
) {
  // Format vessel name
  const vesselType = vesselName.trim().toUpperCase();
  let vesselKey = vesselName.trim().toLowerCase().replace(/\s+/g, '_');

  // Format option value
  const formattedOptionValue = `${optionValue}yd`;
  vesselKey += `_${formattedOptionValue}`;

  return {
    vesselType,
    vesselKey,
    optionValue: formattedOptionValue,
  };
}
