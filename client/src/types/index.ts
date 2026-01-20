// client/src/types/index.ts

// 对应 Go 的 Environment 结构体
export interface Environment {
  id: number;
  name: string;
  status: 'available' | 'occupied';
}

// 对应 Go 的 Booking 结构体
export interface Booking {
  id: number;
  environment_id: number;
  environment?: Environment;
  user: string;
  duration_minutes: number;
}
