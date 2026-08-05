import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface SetupDirtyContextValue {
  registerDirty: (sectionId: string, isDirty: boolean) => void;
  confirmIfDirty: (onProceed: () => void) => boolean;
  isAnyDirty: boolean;
}

const SetupDirtyContext = createContext<SetupDirtyContextValue | null>(null);

export function SetupDirtyProvider({
  children,
  onRequestDiscardConfirm,
}: {
  children: ReactNode;
  onRequestDiscardConfirm: (onProceed: () => void) => void;
}) {
  const dirtySectionsRef = useRef(new Set<string>());
  const [isAnyDirty, setIsAnyDirty] = useState(false);

  const registerDirty = useCallback((sectionId: string, isDirty: boolean) => {
    if (isDirty) {
      dirtySectionsRef.current.add(sectionId);
    } else {
      dirtySectionsRef.current.delete(sectionId);
    }
    setIsAnyDirty(dirtySectionsRef.current.size > 0);
  }, []);

  const confirmIfDirty = useCallback(
    (onProceed: () => void) => {
      if (dirtySectionsRef.current.size === 0) {
        onProceed();
        return true;
      }
      onRequestDiscardConfirm(onProceed);
      return false;
    },
    [onRequestDiscardConfirm],
  );

  const value = useMemo(
    () => ({ registerDirty, confirmIfDirty, isAnyDirty }),
    [confirmIfDirty, isAnyDirty, registerDirty],
  );

  return <SetupDirtyContext.Provider value={value}>{children}</SetupDirtyContext.Provider>;
}

export function useSetupDirty(sectionId: string, isDirty: boolean) {
  const context = useContext(SetupDirtyContext);

  useEffect(() => {
    if (!context) return;
    context.registerDirty(sectionId, isDirty);
    return () => context.registerDirty(sectionId, false);
  }, [context, isDirty, sectionId]);
}

export function useSetupDirtyNavigation() {
  const context = useContext(SetupDirtyContext);
  if (!context) {
    return {
      confirmIfDirty: (onProceed: () => void) => {
        onProceed();
        return true;
      },
      isAnyDirty: false,
    };
  }
  return context;
}
