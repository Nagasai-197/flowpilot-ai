import { supabase } from '../lib/supabase.js';
import { NotFoundError, AppError } from '../utils/errors.js';

export class DbService {
  /**
   * Fetch all records from a table matching conditions
   */
  static async findMany<T>(
    table: string,
    query: Record<string, any> = {},
    select = '*'
  ): Promise<T[]> {
    let builder = supabase.from(table).select(select);

    for (const [key, value] of Object.entries(query)) {
      builder = builder.eq(key, value);
    }

    const { data, error } = await builder;

    if (error) {
      throw new AppError(`DB Selection Error: ${error.message}`, 500);
    }

    return (data as T[]) || [];
  }

  /**
   * Fetch a single record by ID
   */
  static async findById<T>(table: string, id: string): Promise<T> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Record with ID ${id} not found in ${table}`);
      }
      throw new AppError(`DB FindById Error: ${error.message}`, 500);
    }

    return data as T;
  }

  /**
   * Create a new record
   */
  static async create<T>(table: string, payload: Record<string, any>): Promise<T> {
    const { data, error } = await supabase
      .from(table)
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new AppError(`DB Insertion Error: ${error.message}`, 400);
    }

    return data as T;
  }

  /**
   * Update a record by ID
   */
  static async update<T>(
    table: string,
    id: string,
    payload: Record<string, any>
  ): Promise<T> {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(`DB Update Error: ${error.message}`, 400);
    }

    return data as T;
  }

  /**
   * Delete a record by ID
   */
  static async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      throw new AppError(`DB Deletion Error: ${error.message}`, 400);
    }
  }
}
