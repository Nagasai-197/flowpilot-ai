import { supabase } from '../lib/supabase.js';
import { NotFoundError, AppError } from '../utils/errors.js';

export interface TaskFilter {
  status?: string;
  priority?: string;
  tag?: string;
}

export class TaskService {
  /**
   * Fetch all tasks for a specific user, with optional filters
   */
  static async getTasksForUser(userId: string, filters: TaskFilter = {}) {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.priority) {
      const mappedPriority = filters.priority === 'med' ? 'medium' : filters.priority;
      query = query.eq('priority', mappedPriority);
    }
    if (filters.tag) {
      query = query.eq('tag', filters.tag);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError(`Failed to fetch tasks: ${error.message}`, 500);
    }

    const tasks = data || [];
    return tasks.map((t) => {
      let color = t.color;
      if (t.priority === 'high') {
        color = 'red';
      } else if (t.priority === 'medium' || t.priority === 'med') {
        color = 'orange';
      } else if (t.priority === 'low') {
        color = 'green';
      }
      return {
        ...t,
        color,
        priority: t.priority === 'medium' ? 'med' : t.priority,
      };
    });
  }

  /**
   * Fetch a single task by ID for a user, securing ownership
   */
  static async getTaskByIdForUser(taskId: string, userId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Task not found');
      }
      throw new AppError(`Failed to fetch task: ${error.message}`, 500);
    }

    if (data) {
      if (data.priority === 'high') {
        data.color = 'red';
      } else if (data.priority === 'medium' || data.priority === 'med') {
        data.color = 'orange';
      } else if (data.priority === 'low') {
        data.color = 'green';
      }
      data.priority = data.priority === 'medium' ? 'med' : data.priority;
    }
    return data;
  }

  /**
   * Creates a new task bound to the authenticated user
   */
  static async createTaskForUser(userId: string, payload: Record<string, any>) {
    const dbPayload = { ...payload };
    
    // Map priorities to standardized colors and database compatibility values
    if (dbPayload.priority === 'high') {
      dbPayload.color = 'red';
    } else if (dbPayload.priority === 'medium' || dbPayload.priority === 'med') {
      dbPayload.priority = 'medium';
      dbPayload.color = 'orange';
    } else if (dbPayload.priority === 'low') {
      dbPayload.color = 'green';
    }

    const taskPayload = {
      ...dbPayload,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskPayload)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create task: ${error.message}`, 400);
    }

    if (data) {
      data.priority = data.priority === 'medium' ? 'med' : data.priority;
    }
    return data;
  }

  /**
   * Safely updates a task checking user ownership
   */
  static async updateTaskForUser(taskId: string, userId: string, payload: Record<string, any>) {
    // Verify task exists and is owned by the user first to return accurate 404
    await this.getTaskByIdForUser(taskId, userId);

    const dbPayload = { ...payload };

    // Map priorities to standardized colors and database compatibility values
    if (dbPayload.priority === 'high') {
      dbPayload.color = 'red';
    } else if (dbPayload.priority === 'medium' || dbPayload.priority === 'med') {
      dbPayload.priority = 'medium';
      dbPayload.color = 'orange';
    } else if (dbPayload.priority === 'low') {
      dbPayload.color = 'green';
    }

    dbPayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('tasks')
      .update(dbPayload)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update task: ${error.message}`, 400);
    }

    if (data) {
      data.priority = data.priority === 'medium' ? 'med' : data.priority;
    }
    return data;
  }

  /**
   * Safely deletes a task verifying user ownership
   */
  static async deleteTaskForUser(taskId: string, userId: string): Promise<void> {
    // Verify task exists and is owned by the user first to return accurate 404
    await this.getTaskByIdForUser(taskId, userId);

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to delete task: ${error.message}`, 400);
    }
  }
}
