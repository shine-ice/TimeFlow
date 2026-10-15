import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { normalizeRequestError, type RequestError } from "@/api/http";

interface UseRequestOptions<T> {
  showError?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: T) => void;
  onError?: (error: RequestError) => void;
}

export function useRequest<T = unknown, P extends unknown[] = unknown[]>(
  requestFn: (...args: P) => Promise<T>,
  options: UseRequestOptions<T> = {},
) {
  const pendingCount = ref(0);
  const loading = computed(() => pendingCount.value > 0);
  const error = ref<RequestError | null>(null);
  const data = ref<T | null>(null);

  let latestRequestId = 0;

  const run = async (...args: P): Promise<T | null> => {
    const requestId = ++latestRequestId;
    pendingCount.value += 1;

    // 新请求开始时清除上次错误
    if (requestId === latestRequestId) {
      error.value = null;
    }

    try {
      const result = await requestFn(...args);

      if (requestId === latestRequestId) {
        data.value = result;
      }

      options.onSuccess?.(result);

      if (options.successMessage) {
        ElMessage.success(options.successMessage);
      }

      return result;
    } catch (err: unknown) {
      const normalizedError = normalizeRequestError(err);

      if (requestId === latestRequestId) {
        error.value = normalizedError;
      }

      if (options.showError !== false) {
        ElMessage.error(
          options.errorMessage ||
            normalizedError.message ||
            "Request failed, please try again later",
        );
      }

      options.onError?.(normalizedError);
      return null;
    } finally {
      pendingCount.value -= 1;
    }
  };

  return {
    data,
    loading,
    error,
    run,
  };
}
