const CRYPTO_KEY = process.env.NEXT_PUBLIC_CRYPTO_KEY || 'your-fallback-key';

export const encrypt = (text: string): string => {
  try {
    return btoa(encodeURIComponent(text));
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
};

export const decrypt = (encoded: string): string => {
  try {
    return decodeURIComponent(atob(encoded));
  } catch (error) {
    console.error('Decryption error:', error);
    return encoded;
  }
}; 