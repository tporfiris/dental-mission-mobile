// utils/SearchHistoryManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = '@patient_search_history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  location: string;
  timestamp: number;
  searchCount: number; // Track how many times this patient was searched
}

class SearchHistoryManager {
  // Load search history from storage
  async loadHistory(): Promise<SearchHistoryItem[]> {
    try {
      const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (historyJson) {
        const history = JSON.parse(historyJson);
        // Sort by timestamp (most recent first)
        return history.sort((a: SearchHistoryItem, b: SearchHistoryItem) => 
          b.timestamp - a.timestamp
        );
      }
      return [];
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
      const history = await this.loadHistory();
      
      // Check if patient already exists in history
      const existingIndex = history.findIndex(item => item.id === patient.id);
      
      if (existingIndex !== -1) {
        // Update existing entry
        history[existingIndex] = {
          ...history[existingIndex],
          ...patient,
          timestamp: Date.now(),
          searchCount: history[existingIndex].searchCount + 1,
        };
      } else {
        // Add new entry
        history.unshift({
          ...patient,
          timestamp: Date.now(),
          searchCount: 1,
        });
      }
      
      // Keep only the most recent MAX_HISTORY_ITEMS
      const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
      
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(trimmedHistory));
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
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  // Remove a specific item from history
  async removeFromHistory(patientId: string): Promise<void> {
    try {
      const history = await this.loadHistory();
      const filteredHistory = history.filter(item => item.id !== patientId);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('Error removing from history:', error);
    }
  }
}

export const searchHistoryManager = new SearchHistoryManager();