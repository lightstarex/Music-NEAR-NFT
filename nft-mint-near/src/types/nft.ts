export interface NFTType {
  id: string;
  title: string;
  artist: string;
  price: string;
  coverImage: string;
  audioPreview: string;
  copies: {
    total: number;
    available: number;
  };
} 