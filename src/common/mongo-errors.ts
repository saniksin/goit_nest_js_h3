import { mongo } from 'mongoose';

// Код MongoDB для порушення унікального індексу
const DUPLICATE_KEY = 11000;

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY
  );
}
