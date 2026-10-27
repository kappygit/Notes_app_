/**
 * Favorites persistence utility for Notes Web App
 * Stored safely in localStorage under 'kappy_note_favorites'
 */

const STORAGE_KEY = 'kappy_note_favorites';

export function getFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse favorites from localStorage:', err);
    return [];
  }
}

export function isFavorite(noteId) {
  if (!noteId) return false;
  const list = getFavorites();
  return list.includes(noteId);
}

export function toggleFavorite(noteId) {
  if (!noteId) return getFavorites();
  try {
    const current = getFavorites();
    const exists = current.includes(noteId);
    const updated = exists ? current.filter((id) => id !== noteId) : [...current, noteId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save favorites to localStorage:', err);
    return getFavorites();
  }
}
