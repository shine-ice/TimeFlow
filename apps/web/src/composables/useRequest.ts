import { ref } from "vue";
import { ElMessage } from "element-plus";
import { normalizeRequestError, type RequestError } from "@/api/http";

interface UseRequestOptions<T> {
  showError?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: T) => void;
  onError?: (error: RequestError) => void;
}

export function useRequest<T = any, P extends any[] = any[]>(
  requestFn: (...args: P) => Promise<T>,
  options: UseRequestOptions<T> = {},
) {
  const loading = ref(false);
  const error = ref<RequestError | null>(null);
  const data = ref<T | null>(null);

  const run = async (...args: P): Promise<T | null> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await requestFn(...args);
      data.value = result;

      options.onSuccess?.(result);

      if (options.successMessage) {
        ElMessage.success(options.successMessage);
      }

      return result;
    } catch (err: unknown) {
      const normalizedError = normalizeRequestError(err);
      error.value = normalizedError;

      const message =
        options.errorMessage ||
        normalizedError.message ||
        "Request failed, please try again later";

      if (options.showError !== false) {
        ElMessage.error(message);
      }

      options.onError?.(normalizedError);

      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    loading,
    error,
    run,
  };
}
