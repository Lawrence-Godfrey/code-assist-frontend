import { StoreApi, UseBoundStore } from 'zustand';

/**
 * Creates an object with selector functions to make state access more convenient
 * This allows us to use the store like: 
 * const selectedChatId = useStore.selectedChatId();
 * Instead of:
 * const selectedChatId = useStore(state => state.selectedChatId);
 */
export function createSelectors<T extends object, U extends object>(
  store: UseBoundStore<StoreApi<T>>
) {
  type WithSelectors = {
    [K in keyof T]: () => T[K];
  } & {
    use: {
      [K in keyof T]: () => T[K];
    };
  } & UseBoundStore<StoreApi<T>>;

  // Create an object that contains all selectors
  const storeWithSelectors = store as WithSelectors;

  // Create a selector for each key in state
  for (const key of Object.keys(store.getState())) {
    const selector = (state: T) => state[key as keyof T];
    storeWithSelectors[key as keyof T] = () => store(selector);
    
    // Also add the same selectors under the "use" namespace
    if (!storeWithSelectors.use) {
      storeWithSelectors.use = {} as WithSelectors['use'];
    }
    storeWithSelectors.use[key as keyof T] = () => store(selector);
  }

  return storeWithSelectors;
}