import { partition } from 'lodash';
import { memoize } from 'proxy-memoize';
import { Mutate, StoreApi, create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ClassModel, ClassModelOriginal } from '../types';
import { calcTongSoTC, extractListMaLop, hasTimetableSlot, isSameAgGridRowId, parseListMaLop } from '../utils';

export type TimetablePlan = {
  id: string;
  name: string;
  selectedClasses: ClassModel[];
  isChiVeTkb: boolean;
  textareaChiVeTkb: string;
};

type TkbStore = {
  dataExcel: {
    fileName: string;
    data: ClassModelOriginal[];
    /* @deprecated: use lastUpdateTimestamp instead (keep for backward compatibility) */
    lastUpdate?: string;
    lastUpdateTimestamp?: number;
  } | null;

  plans: TimetablePlan[];
  activePlanId: string;

  selectedClasses: ClassModel[];
  // in case Buoc 3 chi ve TKB chu khong dung Buoc 2 Xep Lop
  isChiVeTkb: boolean;
  textareaChiVeTkb: string;

  setDataExcel: (data: TkbStore['dataExcel']) => void;
  setSelectedClasses: (data: TkbStore['selectedClasses']) => void;
  removeClasses: (data: ClassModel[]) => void;
  setIsChiVeTkb: (data: TkbStore['isChiVeTkb']) => void;
  setTextareChiVeTkb: (data: TkbStore['textareaChiVeTkb']) => void;

  // Plan management actions
  setActivePlanId: (id: string) => void;
  createPlan: (name?: string) => void;
  duplicatePlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  deletePlan: (id: string) => void;
  movePlan: (fromIndex: number, toIndex: number) => void;
  resetAllData: () => void;
};

const getDefaultPlans = (state: Partial<TkbStore>): TimetablePlan[] => [
  {
    id: 'plan_1',
    name: 'Plan 1',
    selectedClasses: state.selectedClasses || [],
    isChiVeTkb: state.isChiVeTkb || false,
    textareaChiVeTkb: state.textareaChiVeTkb || '',
  },
];

export const useTkbStore = create<TkbStore>()(
  persist(
    (set, get) => ({
      dataExcel: null,

      plans: [
        {
          id: 'plan_1',
          name: 'Plan 1',
          selectedClasses: [],
          isChiVeTkb: false,
          textareaChiVeTkb: '',
        },
      ],
      activePlanId: 'plan_1',

      selectedClasses: [], // [{}, {}]
      isChiVeTkb: false,
      textareaChiVeTkb: '',

      setDataExcel: (data) => {
        const newDataExcel = data?.data ?? [];
        const currentSelectedClasses = get().selectedClasses;
        const newSelectedClasses = newDataExcel.filter((newClass) =>
          currentSelectedClasses.some((selectedClass) => isSameAgGridRowId(selectedClass, newClass)),
        );
        set({ dataExcel: data, selectedClasses: newSelectedClasses });
      },
      setSelectedClasses: (data) => {
        const newMaLopList = extractListMaLop(data);
        const state = get();
        const plans = state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state);
        const activeId = state.activePlanId || plans[0].id;
        const updatedPlans = plans.map((p) =>
          p.id === activeId ? { ...p, selectedClasses: data, textareaChiVeTkb: newMaLopList.join(',') } : p,
        );
        set({
          plans: updatedPlans,
          selectedClasses: data,
          textareaChiVeTkb: newMaLopList.join(','),
        });
      },
      removeClasses: (classesToRemove) => {
        set((state) => {
          const currentClasses = selectSelectedClassesBuoc3(state);
          const removeCodes = new Set(classesToRemove.map((c) => String(c.MaLop).toUpperCase()));
          const newSelectedClasses = currentClasses.filter(
            (selectedClass) =>
              !removeCodes.has(String(selectedClass.MaLop).toUpperCase()) &&
              classesToRemove.every((classToRemove) => !isSameAgGridRowId(selectedClass, classToRemove)),
          );
          const newMaLopList = extractListMaLop(newSelectedClasses);
          const plans = state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state);
          const activeId = state.activePlanId || plans[0].id;
          const updatedPlans = plans.map((p) =>
            p.id === activeId
              ? { ...p, selectedClasses: newSelectedClasses, textareaChiVeTkb: newMaLopList.join(',') }
              : p,
          );
          return {
            plans: updatedPlans,
            selectedClasses: newSelectedClasses,
            textareaChiVeTkb: newMaLopList.join(','),
          };
        });
      },
      setIsChiVeTkb: (data) => {
        set((state) => {
          const plans = state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state);
          const activeId = state.activePlanId || plans[0].id;
          const updatedPlans = plans.map((p) => (p.id === activeId ? { ...p, isChiVeTkb: data } : p));
          return { plans: updatedPlans, isChiVeTkb: data };
        });
      },
      setTextareChiVeTkb: (data) => {
        const upper = data.toUpperCase();
        set((state) => {
          const plans = state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state);
          const activeId = state.activePlanId || plans[0].id;
          const updatedPlans = plans.map((p) => (p.id === activeId ? { ...p, textareaChiVeTkb: upper } : p));
          return { plans: updatedPlans, textareaChiVeTkb: upper };
        });
      },

      setActivePlanId: (id) => {
        const state = get();
        const plans = state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state);
        const targetPlan = plans.find((p) => p.id === id);
        if (!targetPlan) return;

        set({
          activePlanId: id,
          selectedClasses: targetPlan.selectedClasses || [],
          isChiVeTkb: targetPlan.isChiVeTkb || false,
          textareaChiVeTkb: targetPlan.textareaChiVeTkb || '',
        });
      },

      createPlan: (customName) => {
        const state = get();
        const plans = state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state);
        const nextNum = plans.length + 1;
        const name = customName || `Plan ${nextNum}`;
        const newPlan: TimetablePlan = {
          id: `plan_${Date.now()}`,
          name,
          selectedClasses: [],
          isChiVeTkb: false,
          textareaChiVeTkb: '',
        };
        const updatedPlans = [...plans, newPlan];
        set({
          plans: updatedPlans,
          activePlanId: newPlan.id,
          selectedClasses: [],
          isChiVeTkb: false,
          textareaChiVeTkb: '',
        });
      },

      duplicatePlan: (id) => {
        const state = get();
        const plans = state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state);
        const sourcePlan = plans.find((p) => p.id === id);
        if (!sourcePlan) return;

        const nextNum = plans.length + 1;
        const newPlan: TimetablePlan = {
          id: `plan_${Date.now()}`,
          name: `Plan ${nextNum}`,
          selectedClasses: [...sourcePlan.selectedClasses],
          isChiVeTkb: sourcePlan.isChiVeTkb,
          textareaChiVeTkb: sourcePlan.textareaChiVeTkb,
        };
        const updatedPlans = [...plans, newPlan];
        set({
          plans: updatedPlans,
          activePlanId: newPlan.id,
          selectedClasses: newPlan.selectedClasses,
          isChiVeTkb: newPlan.isChiVeTkb,
          textareaChiVeTkb: newPlan.textareaChiVeTkb,
        });
      },

      renamePlan: (id, name) => {
        const state = get();
        const plans = state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state);
        const updatedPlans = plans.map((p) => (p.id === id ? { ...p, name } : p));
        set({ plans: updatedPlans });
      },

      deletePlan: (id) => {
        const state = get();
        const plans = state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state);
        if (plans.length <= 1) return;

        const updatedPlans = plans.filter((p) => p.id !== id);
        let nextActiveId = state.activePlanId;
        if (state.activePlanId === id) {
          nextActiveId = updatedPlans[0].id;
        }
        const activePlan = updatedPlans.find((p) => p.id === nextActiveId) || updatedPlans[0];
        set({
          plans: updatedPlans,
          activePlanId: activePlan.id,
          selectedClasses: activePlan.selectedClasses || [],
          isChiVeTkb: activePlan.isChiVeTkb || false,
          textareaChiVeTkb: activePlan.textareaChiVeTkb || '',
        });
      },

      movePlan: (fromIndex, toIndex) => {
        const state = get();
        const plans = [...(state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state))];
        if (fromIndex < 0 || fromIndex >= plans.length || toIndex < 0 || toIndex >= plans.length) return;
        const [moved] = plans.splice(fromIndex, 1);
        plans.splice(toIndex, 0, moved);
        set({ plans });
      },

      resetAllData: () => {
        set({
          dataExcel: null,
          selectedClasses: [],
          isChiVeTkb: false,
          textareaChiVeTkb: '',
          plans: [
            {
              id: 'plan_1',
              name: 'Plan 1',
              selectedClasses: [],
              isChiVeTkb: false,
              textareaChiVeTkb: '',
            },
          ],
          activePlanId: 'plan_1',
        });
      },
    }),
    {
      name: 'tkb-state-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

type StoreWithPersist = Mutate<StoreApi<TkbStore>, [['zustand/persist', unknown]]>;
export const withStorageDOMEvents = (store: StoreWithPersist) => {
  const storageEventCallback = (e: StorageEvent) => {
    if (e.key === store.persist.getOptions().name && e.newValue) {
      store.persist.rehydrate();
    }
  };
  window.addEventListener('storage', storageEventCallback);
  return () => {
    window.removeEventListener('storage', storageEventCallback);
  };
};
// sync state between tabs: https://github.com/pmndrs/zustand/issues/714
// TODO: more granular sync (only sync selectedClasses, not all state)
if (process.env.NODE_ENV !== 'test') withStorageDOMEvents(useTkbStore);

export const selectDataExcel = (state: TkbStore) => state.dataExcel;
export const selectSelectedClasses = (state: TkbStore) => state.selectedClasses;
export const selectIsChiVeTkb = (state: TkbStore) =>
  state.isChiVeTkb || window.location.search.includes('self_selected'); // TODO: constant for self_selected
export const selectTextareaChiVeTkb = (state: TkbStore) => {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('self_selected') || state.textareaChiVeTkb;
};
export const selectFinalDataTkb = (state: TkbStore): ClassModel[] => {
  const dataExcel = selectDataExcel(state);
  return dataExcel?.data ?? [];
};
export const selectSelectedClassesBuoc3 = memoize((state: TkbStore): ClassModel[] => {
  const isChiVeTkb = selectIsChiVeTkb(state);
  const textareaChiVeTkb = selectTextareaChiVeTkb(state);
  const finalDataTkb = selectFinalDataTkb(state);

  if (isChiVeTkb) {
    const listMaLop = new Set(parseListMaLop(textareaChiVeTkb));
    return (finalDataTkb || []).filter((it) => !!it && listMaLop.has(String(it.MaLop).toUpperCase()));
  }

  return (selectSelectedClasses(state) || []).filter((it): it is ClassModel => !!it);
});
export const selectTongSoTcSelected = (state: TkbStore) => calcTongSoTC(selectSelectedClasses(state));
export const selectTongSoTcBuoc3 = (state: TkbStore) => calcTongSoTC(selectSelectedClassesBuoc3(state));
export const selectPhanLoaiHocTrenTruong = memoize((state: TkbStore): [ClassModel[], ClassModel[]] => {
  // Lớp online/không có buổi cố định và lớp chưa được xếp THỨ/TIẾT
  // vẫn được chọn, tính tín chỉ và đăng ký; chỉ không đưa vào lưới thời khóa biểu.
  return partition(selectSelectedClassesBuoc3(state), (classModel) => !hasTimetableSlot(classModel));
});

export const selectPlans = (state: TkbStore): TimetablePlan[] => {
  const rawPlans = state.plans && state.plans.length > 0 ? state.plans : getDefaultPlans(state);
  return rawPlans.map((p, index) => {
    let name = p.name || `Plan ${index + 1}`;
    if (name.startsWith('Phương án')) {
      const suffix = name.replace(/^Phương án\s*/i, '').trim();
      name = suffix ? `Plan ${suffix}` : `Plan ${index + 1}`;
    }
    return { ...p, name };
  });
};

export const selectActivePlanId = (state: TkbStore): string => {
  const plans = selectPlans(state);
  return state.activePlanId && plans.some((p) => p.id === state.activePlanId)
    ? state.activePlanId
    : plans[0].id;
};
