import { create } from 'zustand';

const useUIStore = create((set) => ({
  liveClaimsCount: 0,
  recentClaims: [],

  addLiveClaim: (claim) => set((state) => ({
    liveClaimsCount: state.liveClaimsCount + 1,
    recentClaims: [claim, ...state.recentClaims].slice(0, 10),
  })),

  resetLiveCount: () => set({ liveClaimsCount: 0 }),
}));

export default useUIStore;
