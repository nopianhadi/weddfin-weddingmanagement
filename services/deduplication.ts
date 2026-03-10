/**
 * Deduplication Service
 * Mencegah duplicate entries dari realtime updates
 */

export class DeduplicationService<T extends { id: string }> {
  private processedIds = new Set<string>();
  private readonly maxSize = 1000; // Limit size to prevent memory leak
  
  /**
   * Check if item has been processed recently
   */
  isProcessed(id: string): boolean {
    return this.processedIds.has(id);
  }
  
  /**
   * Mark item as processed
   */
  markProcessed(id: string): void {
    // If set is too large, clear oldest entries (FIFO)
    if (this.processedIds.size >= this.maxSize) {
      const firstId = this.processedIds.values().next().value;
      this.processedIds.delete(firstId);
    }
    this.processedIds.add(id);
  }
  
  /**
   * Add item to array if not duplicate
   */
  addIfNotDuplicate(items: T[], newItem: T): T[] {
    // Check if item already exists
    const exists = items.some(item => item.id === newItem.id);
    if (exists) {
      console.log(`[Deduplication] Skipping duplicate item: ${newItem.id}`);
      return items;
    }
    
    // Mark as processed
    this.markProcessed(newItem.id);
    
    return [newItem, ...items];
  }
  
  /**
   * Update item in array, avoiding duplicates
   */
  updateIfExists(items: T[], updatedItem: Partial<T> & { id: string }): T[] {
    const index = items.findIndex(item => item.id === updatedItem.id);
    
    if (index === -1) {
      console.warn(`[Deduplication] Item not found for update: ${updatedItem.id}`);
      return items;
    }
    
    // Mark as processed
    this.markProcessed(updatedItem.id);
    
    // Update the item
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updatedItem };
    return newItems;
  }
  
  /**
   * Remove item from array
   */
  removeIfExists(items: T[], id: string): T[] {
    return items.filter(item => item.id !== id);
  }
  
  /**
   * Clear processed IDs cache
   */
  clear(): void {
    this.processedIds.clear();
  }
}

// Create singleton instances for common entities
export const transactionDedup = new DeduplicationService();
export const projectDedup = new DeduplicationService();
export const clientDedup = new DeduplicationService();
export const teamMemberDedup = new DeduplicationService();
export const leadDedup = new DeduplicationService();
export const notificationDedup = new DeduplicationService();
