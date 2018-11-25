// user key for local or session storage after login
export const LOGGED_IN_USER_KEY = 'auth';

// property value type options
export enum PROPERTY_VALUE_TYPES {
  STRING = 'string',
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  OBJECT = 'object',
  STRING_ARRAY = 'string[]',
  NUMBER_ARRAY = 'number[]',
  BOOLEAN_ARRAY = 'boolean[]',
}

export * from '../../environments/environment';
