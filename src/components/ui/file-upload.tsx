import { useDirection } from "@base-ui/react/direction-provider";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
  FileAudioIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
  FileZipIcon,
} from "@phosphor-icons/react";
import { useDebouncer, useThrottler } from "@tanstack/react-pacer";
import type {
  ChangeEvent,
  ClipboardEvent,
  ComponentProps,
  DragEvent,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import { useAsRef } from "@/hooks/use-as-ref";
import { useLazyRef } from "@/hooks/use-lazy-ref";
import { cn } from "@/lib/utils";

const ROOT_NAME = "FileUpload";
const DROPZONE_NAME = "FileUploadDropzone";
const LIST_NAME = "FileUploadList";
const ITEM_NAME = "FileUploadItem";
const ITEM_PREVIEW_NAME = "FileUploadItemPreview";
const ITEM_METADATA_NAME = "FileUploadItemMetadata";
const ITEM_DELETE_NAME = "FileUploadItemDelete";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

function getFileIcon(file: File) {
  const type = file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (type.startsWith("video/")) {
    return <FileVideoIcon />;
  }

  if (type.startsWith("audio/")) {
    return <FileAudioIcon />;
  }

  if (
    type.startsWith("text/") ||
    ["txt", "md", "rtf", "pdf"].includes(extension)
  ) {
    return <FileTextIcon />;
  }

  if (
    [
      "html",
      "css",
      "js",
      "jsx",
      "ts",
      "tsx",
      "json",
      "xml",
      "php",
      "py",
      "rb",
      "java",
      "c",
      "cpp",
      "cs",
    ].includes(extension)
  ) {
    return <FileCodeIcon />;
  }

  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) {
    return <FileZipIcon />;
  }

  if (
    ["exe", "msi", "app", "apk", "deb", "rpm"].includes(extension) ||
    type.startsWith("application/")
  ) {
    return <FileIcon />;
  }

  return <FileIcon />;
}

type Direction = "ltr" | "rtl";

interface FileState {
  file: File;
  progress: number;
  error?: string;
  status: "idle" | "uploading" | "error" | "success";
}

interface StoreState {
  files: Map<File, FileState>;
  dragOver: boolean;
  invalid: boolean;
}

type StoreAction =
  | { type: "ADD_FILES"; files: File[] }
  | { type: "SET_FILES"; files: File[] }
  | { type: "SET_PROGRESS"; file: File; progress: number }
  | { type: "SET_SUCCESS"; file: File }
  | { type: "SET_ERROR"; file: File; error: string }
  | { type: "REMOVE_FILE"; file: File }
  | { type: "SET_DRAG_OVER"; dragOver: boolean }
  | { type: "SET_INVALID"; invalid: boolean }
  | { type: "CLEAR" };

type Store = {
  getState: () => StoreState;
  dispatch: (action: StoreAction) => void;
  subscribe: (listener: () => void) => () => void;
};

const StoreContext = createContext<Store | null>(null);

function useStoreContext(consumerName: string) {
  const context = use(StoreContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

function useStore<T>(selector: (state: StoreState) => T): T {
  const store = useStoreContext("useStore");

  const lastValueRef = useLazyRef<{ value: T; state: StoreState } | null>(
    () => null,
  );

  const getSnapshot = useCallback(() => {
    const state = store.getState();
    const prevValue = lastValueRef.current;

    if (prevValue && prevValue.state === state) {
      return prevValue.value;
    }

    const nextValue = selector(state);
    lastValueRef.current = { value: nextValue, state };
    return nextValue;
  }, [store, selector, lastValueRef]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface FileUploadContextValue {
  inputId: string;
  dropzoneId: string;
  listId: string;
  labelId: string;
  disabled: boolean;
  dir: Direction;
  inputRef: RefObject<HTMLInputElement | null>;
  urlCache: WeakMap<File, string>;
}

const FileUploadContext = createContext<FileUploadContextValue | null>(null);

function useFileUploadContext(consumerName: string) {
  const context = use(FileUploadContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

interface FileUploadProps
  extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  value?: File[];
  defaultValue?: File[];
  onValueChange?: (files: File[]) => void;
  onAccept?: (files: File[]) => void;
  onFileAccept?: (file: File) => void;
  onFileReject?: (file: File, message: string) => void;
  onFileValidate?: (file: File) => string | null | undefined;
  onUpload?: (
    files: File[],
    options: {
      onProgress: (file: File, progress: number) => void;
      onSuccess: (file: File) => void;
      onError: (file: File, error: Error) => void;
    },
  ) => Promise<void> | void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  dir?: Direction;
  label?: string;
  name?: string;
  asChild?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  multiple?: boolean;
  required?: boolean;
}

function FileUpload(props: FileUploadProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    onAccept,
    onFileAccept,
    onFileReject,
    onFileValidate,
    onUpload,
    accept,
    maxFiles,
    maxSize,
    dir: dirProp,
    label,
    name,
    asChild,
    disabled = false,
    invalid = false,
    multiple = false,
    required = false,
    children,
    className,
    ...rootProps
  } = props;

  const inputId = useId();
  const dropzoneId = useId();
  const listId = useId();
  const labelId = useId();

  const contextDir = useDirection();
  const dir = dirProp ?? contextDir;
  const listeners = useLazyRef(() => new Set<() => void>()).current;
  const files = useLazyRef<Map<File, FileState>>(() => new Map()).current;
  const urlCache = useLazyRef(() => new WeakMap<File, string>()).current;
  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = value !== undefined;

  const propsRef = useAsRef({
    onValueChange,
    onAccept,
    onFileAccept,
    onFileReject,
    onFileValidate,
    onUpload,
  });

  const store = useMemo<Store>(() => {
    let state: StoreState = {
      files,
      dragOver: false,
      invalid: invalid,
    };

    function reducer(state: StoreState, action: StoreAction): StoreState {
      switch (action.type) {
        case "ADD_FILES": {
          for (const file of action.files) {
            files.set(file, {
              file,
              progress: 0,
              status: "idle",
            });
          }

          if (propsRef.current.onValueChange) {
            const fileList = Array.from(files.values()).map(
              (fileState) => fileState.file,
            );
            propsRef.current.onValueChange(fileList);
          }
          return { ...state, files };
        }

        case "SET_FILES": {
          const newFileSet = new Set(action.files);
          for (const existingFile of files.keys()) {
            if (!newFileSet.has(existingFile)) {
              files.delete(existingFile);
            }
          }

          for (const file of action.files) {
            const existingState = files.get(file);
            if (!existingState) {
              files.set(file, {
                file,
                progress: 0,
                status: "idle",
              });
            }
          }
          return { ...state, files };
        }

        case "SET_PROGRESS": {
          const fileState = files.get(action.file);
          if (fileState) {
            files.set(action.file, {
              ...fileState,
              progress: action.progress,
              status: "uploading",
            });
          }
          return { ...state, files };
        }

        case "SET_SUCCESS": {
          const fileState = files.get(action.file);
          if (fileState) {
            files.set(action.file, {
              ...fileState,
              progress: 100,
              status: "success",
            });
          }
          return { ...state, files };
        }

        case "SET_ERROR": {
          const fileState = files.get(action.file);
          if (fileState) {
            files.set(action.file, {
              ...fileState,
              error: action.error,
              status: "error",
            });
          }
          return { ...state, files };
        }

        case "REMOVE_FILE": {
          const cachedUrl = urlCache.get(action.file);
          if (cachedUrl) {
            URL.revokeObjectURL(cachedUrl);
            urlCache.delete(action.file);
          }

          files.delete(action.file);

          if (propsRef.current.onValueChange) {
            const fileList = Array.from(files.values()).map(
              (fileState) => fileState.file,
            );
            propsRef.current.onValueChange(fileList);
          }
          return { ...state, files };
        }

        case "SET_DRAG_OVER": {
          return { ...state, dragOver: action.dragOver };
        }

        case "SET_INVALID": {
          return { ...state, invalid: action.invalid };
        }

        case "CLEAR": {
          for (const file of files.keys()) {
            const cachedUrl = urlCache.get(file);
            if (cachedUrl) {
              URL.revokeObjectURL(cachedUrl);
              urlCache.delete(file);
            }
          }

          files.clear();
          if (propsRef.current.onValueChange) {
            propsRef.current.onValueChange([]);
          }
          return { ...state, files, invalid: false };
        }

        default:
          return state;
      }
    }

    return {
      getState: () => state,
      dispatch: (action) => {
        state = reducer(state, action);
        for (const listener of listeners) {
          listener();
        }
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }, [listeners, files, invalid, propsRef, urlCache]);

  const acceptTypes = useMemo(
    () => accept?.split(",").map((t) => t.trim()) ?? null,
    [accept],
  );

  const progressThrottler = useThrottler(
    ({ file, progress }: { file: File; progress: number }) => {
      store.dispatch({
        type: "SET_PROGRESS",
        file,
        progress: Math.min(Math.max(0, progress), 100),
      });
    },
    {
      wait: 16,
    },
  );

  const invalidResetDebouncer = useDebouncer(
    () => store.dispatch({ type: "SET_INVALID", invalid: false }),
    {
      wait: 2000,
    },
  );

  const onProgress = useCallback(
    (file: File, progress: number) => {
      progressThrottler.maybeExecute({ file, progress });
    },
    [progressThrottler],
  );

  useEffect(() => {
    if (isControlled) {
      store.dispatch({ type: "SET_FILES", files: value });
    } else if (
      defaultValue &&
      defaultValue.length > 0 &&
      !store.getState().files.size
    ) {
      store.dispatch({ type: "SET_FILES", files: defaultValue });
    }
  }, [value, defaultValue, isControlled, store]);

  useEffect(() => {
    return () => {
      for (const file of files.keys()) {
        const cachedUrl = urlCache.get(file);
        if (cachedUrl) {
          URL.revokeObjectURL(cachedUrl);
        }
      }
    };
  }, [files, urlCache]);

  const onFilesUpload = useCallback(
    async (files: File[]) => {
      try {
        for (const file of files) {
          store.dispatch({ type: "SET_PROGRESS", file, progress: 0 });
        }

        if (propsRef.current.onUpload) {
          await propsRef.current.onUpload(files, {
            onProgress,
            onSuccess: (file) => {
              store.dispatch({ type: "SET_SUCCESS", file });
            },
            onError: (file, error) => {
              store.dispatch({
                type: "SET_ERROR",
                file,
                error: error.message ?? "Upload failed",
              });
            },
          });
        } else {
          for (const file of files) {
            store.dispatch({ type: "SET_SUCCESS", file });
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        for (const file of files) {
          store.dispatch({
            type: "SET_ERROR",
            file,
            error: errorMessage,
          });
        }
      }
    },
    [store, propsRef, onProgress],
  );

  const onFilesChange = useCallback(
    (originalFiles: File[]) => {
      if (disabled) return;

      let filesToProcess = [...originalFiles];
      let invalid = false;

      if (maxFiles) {
        const currentCount = store.getState().files.size;
        const remainingSlotCount = Math.max(0, maxFiles - currentCount);

        if (remainingSlotCount < filesToProcess.length) {
          const rejectedFiles = filesToProcess.slice(remainingSlotCount);
          invalid = true;

          filesToProcess = filesToProcess.slice(0, remainingSlotCount);

          for (const file of rejectedFiles) {
            let rejectionMessage = `Maximum ${maxFiles} files allowed`;

            if (propsRef.current.onFileValidate) {
              const validationMessage = propsRef.current.onFileValidate(file);
              if (validationMessage) {
                rejectionMessage = validationMessage;
              }
            }

            propsRef.current.onFileReject?.(file, rejectionMessage);
          }
        }
      }

      const acceptedFiles: File[] = [];
      const rejectedFiles: { file: File; message: string }[] = [];
      const acceptTypeSet = acceptTypes
        ? new Set(acceptTypes.filter((t) => !t.includes("/*")))
        : null;
      const wildcardTypes = acceptTypes
        ? acceptTypes.filter((t) => t.includes("/*"))
        : null;

      for (const file of filesToProcess) {
        let rejected = false;
        let rejectionMessage = "";
        const onFileReject = propsRef.current.onFileReject;

        if (propsRef.current.onFileValidate) {
          const validationMessage = propsRef.current.onFileValidate(file);
          if (validationMessage) {
            rejectionMessage = validationMessage;
            onFileReject?.(file, rejectionMessage);
            rejected = true;
            invalid = true;
            continue;
          }
        }

        if (acceptTypes) {
          const fileType = file.type;
          const fileExtension = `.${file.name.split(".").pop()}`;

          if (
            !acceptTypeSet?.has(fileType) &&
            !acceptTypeSet?.has(fileExtension) &&
            !wildcardTypes?.some((type) =>
              fileType.startsWith(type.replace("/*", "/")),
            )
          ) {
            rejectionMessage = "File type not accepted";
            onFileReject?.(file, rejectionMessage);
            rejected = true;
            invalid = true;
          }
        }

        if (maxSize && file.size > maxSize) {
          rejectionMessage = "File too large";
          onFileReject?.(file, rejectionMessage);
          rejected = true;
          invalid = true;
        }

        if (!rejected) {
          acceptedFiles.push(file);
        } else {
          rejectedFiles.push({ file, message: rejectionMessage });
        }
      }

      if (invalid) {
        store.dispatch({ type: "SET_INVALID", invalid });
        invalidResetDebouncer.maybeExecute();
      }

      if (acceptedFiles.length > 0) {
        store.dispatch({ type: "ADD_FILES", files: acceptedFiles });

        if (isControlled && propsRef.current.onValueChange) {
          const currentFiles = Array.from(store.getState().files.values()).map(
            (f) => f.file,
          );
          propsRef.current.onValueChange([...currentFiles]);
        }

        if (propsRef.current.onAccept) {
          propsRef.current.onAccept(acceptedFiles);
        }

        for (const file of acceptedFiles) {
          propsRef.current.onFileAccept?.(file);
        }

        if (propsRef.current.onUpload) {
          requestAnimationFrame(() => {
            onFilesUpload(acceptedFiles);
          });
        }
      }
    },
    [
      store,
      isControlled,
      propsRef,
      onFilesUpload,
      invalidResetDebouncer,
      maxFiles,
      acceptTypes,
      maxSize,
      disabled,
    ],
  );

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      onFilesChange(files);
      event.target.value = "";
    },
    [onFilesChange],
  );

  const contextValue = useMemo<FileUploadContextValue>(
    () => ({
      dropzoneId,
      inputId,
      listId,
      labelId,
      dir,
      disabled,
      inputRef,
      urlCache,
    }),
    [dropzoneId, inputId, listId, labelId, dir, disabled, urlCache],
  );

  const element = useRender({
    defaultTagName: "div",
    render: asChild ? (children as ReactElement) : undefined,
    props: mergeProps<"div">(
      {
        // @ts-expect-error: extra field for base-ui
        "data-disabled": disabled ? "" : undefined,
        "data-slot": "file-upload",
        dir,
        className: cn("relative flex flex-col gap-2", className),
        children: (
          <>
            {children}
            <input
              type="file"
              id={inputId}
              aria-labelledby={labelId}
              aria-describedby={dropzoneId}
              ref={inputRef}
              tabIndex={-1}
              accept={accept}
              name={name}
              className="sr-only"
              disabled={disabled}
              multiple={multiple}
              required={required}
              onChange={onInputChange}
            />
            <div id={labelId} className="sr-only">
              {label ?? "File upload"}
            </div>
          </>
        ),
      },
      rootProps,
    ),
  });

  return (
    <StoreContext.Provider value={store}>
      <FileUploadContext.Provider value={contextValue}>
        {element}
      </FileUploadContext.Provider>
    </StoreContext.Provider>
  );
}

interface FileUploadDropzoneProps extends ComponentProps<"div"> {
  asChild?: boolean;
}

function FileUploadDropzone(props: FileUploadDropzoneProps) {
  const {
    asChild,
    className,
    onClick: onClickProp,
    onDragOver: onDragOverProp,
    onDragEnter: onDragEnterProp,
    onDragLeave: onDragLeaveProp,
    onDrop: onDropProp,
    onPaste: onPasteProp,
    onKeyDown: onKeyDownProp,
    ...dropzoneProps
  } = props;

  const context = useFileUploadContext(DROPZONE_NAME);
  const store = useStoreContext(DROPZONE_NAME);
  const dragOver = useStore((state) => state.dragOver);
  const invalid = useStore((state) => state.invalid);

  const propsRef = useAsRef({
    onClick: onClickProp,
    onDragOver: onDragOverProp,
    onDragEnter: onDragEnterProp,
    onDragLeave: onDragLeaveProp,
    onDrop: onDropProp,
    onPaste: onPasteProp,
    onKeyDown: onKeyDownProp,
  });

  const onClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      propsRef.current.onClick?.(event);

      if (event.defaultPrevented) return;

      const target = event.target;

      const isFromTrigger =
        target instanceof HTMLElement &&
        target.closest('[data-slot="file-upload-trigger"]');

      if (!isFromTrigger) {
        context.inputRef.current?.click();
      }
    },
    [context.inputRef, propsRef],
  );

  const onDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      propsRef.current.onDragOver?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ type: "SET_DRAG_OVER", dragOver: true });
    },
    [store, propsRef],
  );

  const onDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      propsRef.current.onDragEnter?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ type: "SET_DRAG_OVER", dragOver: true });
    },
    [store, propsRef],
  );

  const onDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      propsRef.current.onDragLeave?.(event);

      if (event.defaultPrevented) return;

      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget &&
        relatedTarget instanceof Node &&
        event.currentTarget.contains(relatedTarget)
      ) {
        return;
      }

      event.preventDefault();
      store.dispatch({ type: "SET_DRAG_OVER", dragOver: false });
    },
    [store, propsRef],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      propsRef.current.onDrop?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ type: "SET_DRAG_OVER", dragOver: false });

      const files = Array.from(event.dataTransfer.files);
      const inputElement = context.inputRef.current;
      if (!inputElement) return;

      const dataTransfer = new DataTransfer();
      for (const file of files) {
        dataTransfer.items.add(file);
      }

      inputElement.files = dataTransfer.files;
      inputElement.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [store, context.inputRef, propsRef],
  );

  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      propsRef.current.onPaste?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ type: "SET_DRAG_OVER", dragOver: false });

      const items = event.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length === 0) return;

      const inputElement = context.inputRef.current;
      if (!inputElement) return;

      const dataTransfer = new DataTransfer();
      for (const file of files) {
        dataTransfer.items.add(file);
      }

      inputElement.files = dataTransfer.files;
      inputElement.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [store, context.inputRef, propsRef],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      propsRef.current.onKeyDown?.(event);

      if (
        !event.defaultPrevented &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        context.inputRef.current?.click();
      }
    },
    [context.inputRef, propsRef],
  );

  return useRender({
    defaultTagName: "div",
    render: asChild ? (dropzoneProps.children as ReactElement) : undefined,
    props: mergeProps<"div">(
      {
        role: "region",
        id: context.dropzoneId,
        "aria-controls": `${context.inputId} ${context.listId}`,
        "aria-disabled": context.disabled,
        "aria-invalid": invalid,
        // @ts-expect-error: extra field for base-ui
        "data-disabled": context.disabled ? "" : undefined,
        "data-dragging": dragOver ? "" : undefined,
        "data-invalid": invalid ? "" : undefined,
        "data-slot": "file-upload-dropzone",
        dir: context.dir,
        tabIndex: context.disabled ? undefined : 0,
        className: cn(
          "relative flex select-none flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 outline-none transition-colors hover:bg-accent/30 focus-visible:border-ring/50 data-disabled:pointer-events-none data-dragging:border-primary/30 data-invalid:border-destructive data-dragging:bg-accent/30 data-invalid:ring-destructive/20",
          className,
        ),
        onClick,
        onDragEnter,
        onDragLeave,
        onDragOver,
        onDrop,
        onKeyDown,
        onPaste,
      },
      dropzoneProps,
    ),
  });
}

interface FileUploadListProps extends ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical";
  asChild?: boolean;
  forceMount?: boolean;
}

function FileUploadList(props: FileUploadListProps) {
  const {
    className,
    orientation = "vertical",
    asChild,
    forceMount,
    ...listProps
  } = props;

  const context = useFileUploadContext(LIST_NAME);
  const fileCount = useStore((state) => state.files.size);
  const shouldRender = forceMount || fileCount > 0;

  return useRender({
    defaultTagName: "div",
    render: asChild ? (listProps.children as ReactElement) : undefined,
    enabled: shouldRender,
    props: mergeProps<"div">(
      {
        role: "list",
        id: context.listId,
        "aria-orientation": orientation,
        // @ts-expect-error: extra field for base-ui
        "data-orientation": orientation,
        "data-slot": "file-upload-list",
        "data-state": shouldRender ? "active" : "inactive",
        dir: context.dir,
        className: cn(
          "data-[state=inactive]:fade-out-0 data-[state=active]:fade-in-0 data-[state=inactive]:slide-out-to-top-2 data-[state=active]:slide-in-from-top-2 flex flex-col gap-2 data-[state=active]:animate-in data-[state=inactive]:animate-out",
          orientation === "horizontal" && "flex-row overflow-x-auto p-1.5",
          className,
        ),
      },
      listProps,
    ),
  });
}

interface FileUploadItemContextValue {
  id: string;
  fileState: FileState | undefined;
  nameId: string;
  sizeId: string;
  statusId: string;
  messageId: string;
}

const FileUploadItemContext = createContext<FileUploadItemContextValue | null>(
  null,
);

function useFileUploadItemContext(consumerName: string) {
  const context = use(FileUploadItemContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``);
  }
  return context;
}

interface FileUploadItemProps extends ComponentProps<"div"> {
  value: File;
  asChild?: boolean;
}

function FileUploadItem(props: FileUploadItemProps) {
  const { value, asChild, className, children, ...itemProps } = props;

  const id = useId();
  const statusId = `${id}-status`;
  const nameId = `${id}-name`;
  const sizeId = `${id}-size`;
  const messageId = `${id}-message`;

  const context = useFileUploadContext(ITEM_NAME);
  const fileState = useStore((state) => state.files.get(value));
  const fileCount = useStore((state) => state.files.size);
  const fileIndex = useStore((state) => {
    const files = Array.from(state.files.keys());
    return files.indexOf(value) + 1;
  });

  const itemContext = useMemo(
    () => ({
      id,
      fileState,
      nameId,
      sizeId,
      statusId,
      messageId,
    }),
    [id, fileState, statusId, nameId, sizeId, messageId],
  );

  const statusText = fileState?.error
    ? `Error: ${fileState.error}`
    : fileState?.status === "uploading"
      ? `Uploading: ${fileState.progress}% complete`
      : fileState?.status === "success"
        ? "Upload complete"
        : "Ready to upload";

  const element = useRender({
    defaultTagName: "div",
    render: asChild ? (children as ReactElement) : undefined,
    enabled: fileState != null,
    props: mergeProps<"div">(
      {
        role: "listitem",
        id,
        "aria-setsize": fileCount,
        "aria-posinset": fileIndex,
        "aria-describedby": `${nameId} ${sizeId} ${statusId} ${
          fileState?.error ? messageId : ""
        }`,
        "aria-labelledby": nameId,
        // @ts-expect-error: extra field for base-ui
        "data-slot": "file-upload-item",
        dir: context.dir,
        className: cn(
          "relative flex items-center gap-2.5 rounded-md border p-3",
          className,
        ),
        children: (
          <>
            {children}
            <span id={statusId} className="sr-only">
              {statusText}
            </span>
          </>
        ),
      },
      itemProps,
    ),
  });

  return (
    <FileUploadItemContext.Provider value={itemContext}>
      {element}
    </FileUploadItemContext.Provider>
  );
}

interface FileUploadItemPreviewProps extends ComponentProps<"div"> {
  render?: (file: File, fallback: () => ReactNode) => ReactNode;
  asChild?: boolean;
}

function FileUploadItemPreview(props: FileUploadItemPreviewProps) {
  const { render, asChild, children, className, ...previewProps } = props;

  const itemContext = useFileUploadItemContext(ITEM_PREVIEW_NAME);
  const context = useFileUploadContext(ITEM_PREVIEW_NAME);

  const getDefaultRender = useCallback(
    (file: File) => {
      if (itemContext.fileState?.file.type.startsWith("image/")) {
        let url = context.urlCache.get(file);
        if (!url) {
          url = URL.createObjectURL(file);
          context.urlCache.set(file, url);
        }

        return (
          <img src={url} alt={file.name} className="size-full object-cover" />
        );
      }

      return getFileIcon(file);
    },
    [itemContext.fileState?.file.type, context.urlCache],
  );

  const onPreviewRender = useCallback(
    (file: File) => {
      if (render) {
        return render(file, () => getDefaultRender(file));
      }

      return getDefaultRender(file);
    },
    [render, getDefaultRender],
  );

  return useRender({
    defaultTagName: "div",
    render: asChild ? (children as ReactElement) : undefined,
    enabled: itemContext.fileState != null,
    props: mergeProps<"div">(
      {
        "aria-labelledby": itemContext.nameId,
        // @ts-expect-error: extra field for base-ui
        "data-slot": "file-upload-preview",
        className: cn(
          "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-accent/50 [&>svg]:size-10",
          className,
        ),
        children: (
          <>
            {itemContext.fileState
              ? onPreviewRender(itemContext.fileState.file)
              : null}
            {children}
          </>
        ),
      },
      previewProps,
    ),
  });
}

interface FileUploadItemMetadataProps extends ComponentProps<"div"> {
  asChild?: boolean;
  size?: "default" | "sm";
}

function FileUploadItemMetadata(props: FileUploadItemMetadataProps) {
  const {
    asChild,
    size = "default",
    children,
    className,
    ...metadataProps
  } = props;

  const context = useFileUploadContext(ITEM_METADATA_NAME);
  const itemContext = useFileUploadItemContext(ITEM_METADATA_NAME);

  return useRender({
    defaultTagName: "div",
    render: asChild ? (children as ReactElement) : undefined,
    enabled: itemContext.fileState != null,
    props: mergeProps<"div">(
      {
        // @ts-expect-error: extra field for base-ui
        "data-slot": "file-upload-metadata",
        dir: context.dir,
        className: cn("flex min-w-0 flex-1 flex-col", className),
        children: children ?? (
          <>
            <span
              id={itemContext.nameId}
              className={cn(
                "truncate font-medium text-sm",
                size === "sm" && "font-normal text-[13px] leading-snug",
              )}
            >
              {itemContext.fileState?.file.name}
            </span>
            <span
              id={itemContext.sizeId}
              className={cn(
                "truncate text-muted-foreground text-xs",
                size === "sm" && "text-[11px] leading-snug",
              )}
            >
              {itemContext.fileState
                ? formatBytes(itemContext.fileState.file.size)
                : null}
            </span>
            {itemContext.fileState?.error && (
              <span
                id={itemContext.messageId}
                className="text-destructive text-xs"
              >
                {itemContext.fileState.error}
              </span>
            )}
          </>
        ),
      },
      metadataProps,
    ),
  });
}
interface FileUploadItemDeleteProps extends ComponentProps<"button"> {
  asChild?: boolean;
}

function FileUploadItemDelete(props: FileUploadItemDeleteProps) {
  const { asChild, onClick: onClickProp, ...deleteProps } = props;

  const store = useStoreContext(ITEM_DELETE_NAME);
  const itemContext = useFileUploadItemContext(ITEM_DELETE_NAME);

  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClickProp?.(event);

      if (!itemContext.fileState || event.defaultPrevented) return;

      store.dispatch({
        type: "REMOVE_FILE",
        file: itemContext.fileState.file,
      });
    },
    [store, itemContext.fileState, onClickProp],
  );

  return useRender({
    defaultTagName: "button",
    render: asChild ? (deleteProps.children as ReactElement) : undefined,
    enabled: itemContext.fileState != null,
    props: mergeProps<"button">(
      {
        type: "button",
        "aria-controls": itemContext.id,
        "aria-describedby": itemContext.nameId,
        // @ts-expect-error: extra field for base-ui
        "data-slot": "file-upload-item-delete",
        onClick,
      },
      deleteProps,
    ),
  });
}

export {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  //
  type FileUploadProps,
};
