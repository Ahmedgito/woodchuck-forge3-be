import {
  HttpException,
  HttpStatus,
  ValidationError,
  ValidationPipeOptions,
} from '@nestjs/common';

function generateErrors(errors: ValidationError[]) {
  const errorObj: any = [];
  errors.forEach((obj) => {
    if ((obj.children?.length ?? 0) > 0) {
      // Recursively get errors from nested objects
      const nestedErrors = generateErrors(obj.children ?? []);
      nestedErrors.forEach((err) => errorObj.push(err));
    } else if (obj.constraints) {
      // Add constraint messages
      for (const constraint in obj.constraints) {
        console.log(obj.constraints[constraint]);
        errorObj.push(obj.constraints[constraint]);
      }
    }
  });
  return errorObj;
}

const validationOptions: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  exceptionFactory: (errors: ValidationError[]) => {
    return new HttpException(
      {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: generateErrors(errors),
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  },
};

export default validationOptions;
