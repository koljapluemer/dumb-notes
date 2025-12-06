/**
 * Validation utilities for note titles and file names
 */

/**
 * Validates that a title is safe for use as a filename.
 *
 * Checks for:
 * - Non-empty string
 * - No trailing spaces or periods
 * - No ".." sequences
 * - No invalid filesystem characters: <>:"/\|?*
 * - No reserved Windows names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
 *
 * @param title - The title to validate
 * @returns true if the title is safe, false otherwise
 */
export function isSafeTitle(title: string): boolean {
  return (
    !!title &&
    !title.endsWith(' ') &&
    !title.endsWith('.') &&
    !title.includes('..') &&
    !/[<>:"/\\|?*\x00-\x1F]/.test(title) &&
    ![
      'CON',
      'PRN',
      'AUX',
      'NUL',
      'COM1',
      'COM2',
      'COM3',
      'COM4',
      'COM5',
      'COM6',
      'COM7',
      'COM8',
      'COM9',
      'LPT1',
      'LPT2',
      'LPT3',
      'LPT4',
      'LPT5',
      'LPT6',
      'LPT7',
      'LPT8',
      'LPT9',
    ].includes(title.toUpperCase())
  )
}
