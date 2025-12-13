export interface ContextoBase {
  rol: string;
  nutricionistaId?: number | null;
}

export interface UserContext extends ContextoBase {
  userId: number;
}
