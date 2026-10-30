import {
  ValidationOptions,
  ValidationArguments,
  registerDecorator,
  ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

@ValidatorConstraint({ name: 'EitherOr', async: false })
class EitherOrConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    // Both fields should not be null or empty at the same time
    if (
      (value === null || value === '') &&
      (relatedValue === null || relatedValue === '')
    ) {
      return false;
    }
    // Both fields should not be filled at the same time
    if (value && relatedValue) {
      return false;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `Either ${args.property} or ${relatedPropertyName} must be filled, but not both.`;
  }
}

export function EitherOr(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: EitherOrConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'BothOrNone', async: false })
class BothOrNoneConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    // Ensure both fields are either present or absent, but not undefined
    const valueDefined = value !== undefined;
    const relatedValueDefined = relatedValue !== undefined;

    if (!valueDefined || !relatedValueDefined) {
      return false;
    }

    // If both are defined, ensure they are not both null or both filled
    if (
      (value === null && relatedValue !== null) ||
      (value !== null && relatedValue === null)
    ) {
      return true;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} and ${relatedPropertyName} must both be present or both be absent.`;
  }
}

export function BothOrNone(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: BothOrNoneConstraint,
    });
  };
}
