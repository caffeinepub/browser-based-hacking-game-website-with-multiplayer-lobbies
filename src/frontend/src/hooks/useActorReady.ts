import { useActor } from './useActor';

/**
 * Hook that provides an explicit actor readiness signal.
 * Use this when you need to wait for the actor to be available before performing operations.
 */
export function useActorReady() {
  const { actor, isFetching } = useActor();
  
  return {
    actor,
    isActorReady: !!actor && !isFetching,
    isFetching,
  };
}
