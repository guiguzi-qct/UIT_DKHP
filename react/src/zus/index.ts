import { partition } from 'lodash';
import { memoize } from 'proxy-memoize';
import { Mutate, StoreApi, create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ClassModel, ClassModelOriginal } from '../types';
import { calcTongSoTC, extractListMaLop, hasTimetableSlot, isSameAgGridRowId, parseListMaLop } from '../utils';

type TkbStore = {
  dataExcel: {
    fileName: string;
    data: ClassModelOriginal[];
    /* @deprecated: use lastUpdateTimestamp instead (keep for backward compatibility) */
    lastUpdate?: string;
    lastUpdateTimestamp?: number;
  } | null;

  selectedClasses: ClassModel[];
  // in case Buoc 3 chi ve TKB chu khong dung Buoc 2 Xep Lop
  isChiVeTkb: boolean;
  textareaChiVeTkb: string;

  setDataExcel: (data: TkbStore['dataExcel']) => void;
  setSelectedClasses: (data: TkbStore['selectedClasses']) => void;
  removeClasses: (data: ClassModel[]) => void;
  setIsChiVeTkb: (data: TkbStore['isChiVeTkb']) => void;
  setTextareChiVeTkb: (data: TkbStore['textareaChiVeTkb']) => void;
};

export const useTkbStore = create<TkbStore>()(
  persist(
    (set, get) => ({
      dataExcel: null,

      selectedClasses: [], // [{}, {}]
      isChiVeTkb: false,
      textareaChiVeTkb: '',

      // TODO: move actions outside of store
      setDataExcel: (data) => {
        const newDataExcel = data?.data ?? [];
        const currentSelectedClasses = get().selectedClasses;
        // When the user uploads a new excel file:
        // Giữ lại các lớp vẫn còn tồn tại khi người dùng tải bản Excel cập nhật.
        const newSelectedClasses = newDataExcel.filter((newClass) =>
          currentSelectedClasses.some((selectedClass) => isSameAgGridRowId(selectedClass, newClass)),
        );
        set({ dataExcel: data, selectedClasses: newSelectedClasses });
      },
      setSelectedClasses: (data) => {
        const newMaLopList = extractListMaLop(data);
        set({ selectedClasses: data, textareaChiVeTkb: newMaLopList.join(',') });
      },
      removeClasses: (classesToRemove) => {
        set((state) => {
          const currentClasses = selectSelectedClassesBuoc3(state);
          const newSelectedClasses = currentClasses.filter((selectedClass) =>
            classesToRemove.every((classToRemove) => !isSameAgGridRowId(selectedClass, classToRemove)),
          );
          const newMaLopList = extractListMaLop(newSelectedClasses);
          return {
            selectedClasses: newSelectedClasses,
            textareaChiVeTkb: newMaLopList.join(','),
          };
        });
      },
      setIsChiVeTkb: (data) => {
        set({ isChiVeTkb: data });
      },
      setTextareChiVeTkb: (data) => {
        set({ textareaChiVeTkb: data.toUpperCase() });
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
    return finalDataTkb.filter((it) => listMaLop.has(String(it.MaLop).toUpperCase()));
  } else {
    return selectSelectedClasses(state);
  }
});
export const selectTongSoTcSelected = (state: TkbStore) => calcTongSoTC(selectSelectedClasses(state));
export const selectTongSoTcBuoc3 = (state: TkbStore) => calcTongSoTC(selectSelectedClassesBuoc3(state));
export const selectPhanLoaiHocTrenTruong = memoize((state: TkbStore): [ClassModel[], ClassModel[]] => {
  // Lớp online/không có buổi cố định và lớp chưa được xếp THỨ/TIẾT
  // vẫn được chọn, tính tín chỉ và đăng ký; chỉ không đưa vào lưới thời khóa biểu.
  return partition(selectSelectedClassesBuoc3(state), (classModel) => !hasTimetableSlot(classModel));
});
