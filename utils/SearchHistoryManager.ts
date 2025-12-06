// utils/SearchHistoryManager.ts
// WatermelonDB VERSION (uses your existing database)

import { database } from '../db';
import { Q } from '@nozbe/watermelondb';

const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  location: string;
  timestamp: number;
  searchCount: number;
}

// You'll need to create a SearchHistory model and add it to your schema
// For now, we'll use a hybrid approach with in-memory + Patient queries

class SearchHistoryManager {
  private recentSearchIds: string[] = [];
  private searchCounts: Map<string, number> = new Map();

  // Load search history from recent IDs + fetch from database
  async loadHistory(): Promise<SearchHistoryItem[]> {
    try {
      if (this.recentSearchIds.length === 0) {
        return [];
      }

      // Fetch patients from database based on recent search IDs
      const patients = await database.get('patients')
        .query(Q.where('id', Q.oneOf(this.recentSearchIds)))
        .fetch();

      // Map to SearchHistoryItem with preserved order
      const historyItems: SearchHistoryItem[] = this.recentSearchIds
        .map(id => {
          const patient = patients.find(p => p.id === id);
          if (!patient) return null;

          return {
            id: patient.id,
            firstName: (patient as any).firstName,
            lastName: (patient as any).lastName,
            age: (patient as any).age,
            gender: (patient as any).gender,
            location: (patient as any).location,
            timestamp: Date.now(), // Could be improved by storing actual timestamps
            searchCount: this.searchCounts.get(id) || 1,
          };
        })
        .filter((item): item is SearchHistoryItem => item !== null);

      return historyItems;
    } catch (error) {
      console.error('Error loading search history:', error);
      return [];
    }
  }

  // Add or update a patient in search history
  async addToHistory(patient: {
    id: string;
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
    location: string;
  }): Promise<void> {
    try {
      // Update search count
      const currentCount = this.searchCounts.get(patient.id) || 0;
      this.searchCounts.set(patient.id, currentCount + 1);

      // Remove if already exists (to move to front)
      this.recentSearchIds = this.recentSearchIds.filter(id => id !== patient.id);
      
      // Add to front
      this.recentSearchIds.unshift(patient.id);

      // Keep only the most recent MAX_HISTORY_ITEMS
      this.recentSearchIds = this.recentSearchIds.slice(0, MAX_HISTORY_ITEMS);
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  }

  // Get frequently searched patients (sorted by search count)
  async getFrequentlySearched(): Promise<SearchHistoryItem[]> {
    try {
      const history = await this.loadHistory();
      
      // Sort by search count (highest first), then by timestamp
      return history
        .filter(item => item.searchCount > 1)
        .sort((a, b) => {
          if (b.searchCount === a.searchCount) {
            return b.timestamp - a.timestamp;
          }
          return b.searchCount - a.searchCount;
        })
        .slice(0, 5); // Top 5 frequently searched
    } catch (error) {
      console.error('Error getting frequently searched:', error);
      return [];
    }
  }

  // Clear search history
  async clearHistory(): Promise<void> {
    try {
      this.recentSearchIds = [];
      this.searchCounts.clear();
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  // Remove a specific item from history
  async removeFromHistory(patientId: string): Promise<void> {
    try {
      this.recentSearchIds = this.recentSearchIds.filter(id => id !== patientId);
      this.searchCounts.delete(patientId);
    } catch (error) {
      console.error('Error removing from history:', error);
    }
  }
}

export const searchHistoryManager = new SearchHistoryManager();