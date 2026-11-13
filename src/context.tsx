import { createContext, useContext } from 'react';
import type { AppState } from './types';
export type AppContextValue={
  data:AppState;
  mutate:(path:string,body:unknown,successText?:string,method?:'POST'|'PUT'|'PATCH')=>Promise<boolean>;
  refresh:()=>Promise<void>;
  toast:(message:string,type?:'success'|'error')=>void;
};
export const AppContext=createContext<AppContextValue|null>(null);
export function useApp(){const context=useContext(AppContext);if(!context)throw new Error('AppContext ausente');return context;}
