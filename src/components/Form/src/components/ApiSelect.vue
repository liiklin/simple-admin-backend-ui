<template>
  <Select
    @dropdown-visible-change="handleFetch"
    v-bind="$attrs"
    @change="handleChange"
    :options="getOptions"
    v-model:value="state"
    :show-search="true"
    @search="searchFun"
    :show-arrow="false"
    :filter-option="filterOption"
    :option-filter-prop="optionFilterProps"
  >
    <template #[item]="data" v-for="item in Object.keys($slots)">
      <slot :name="item" v-bind="data || {}"></slot>
    </template>
    <template #suffixIcon v-if="loading">
      <LoadingOutlined spin />
    </template>
    <template #notFoundContent v-if="loading">
      <span>
        <LoadingOutlined spin class="mr-1" />
        {{ t('component.form.apiSelectNotFound') }}
      </span>
    </template>
  </Select>
</template>
<script lang="ts">
  import { defineComponent, PropType, ref, computed, unref, watch } from 'vue';
  import { Select } from 'ant-design-vue';
  import type { SelectValue } from 'ant-design-vue/es/select';
  import { useRuleFormItem } from '@/hooks/component/useFormItem';
  import { useAttrs } from '@vben/hooks';
  import { LoadingOutlined } from '@ant-design/icons-vue';
  import { useI18n } from '@/hooks/web/useI18n';
  import { propTypes } from '@/utils/propTypes';
  import { isFunction, omit } from 'remeda';
  import { get } from '/@/utils/object';
  import { DefaultOptionType, FilterFunc } from 'ant-design-vue/lib/vc-select/Select';

  type OptionsItem = { label?: string; value?: string; disabled?: boolean; [name: string]: any };

  export default defineComponent({
    name: 'ApiSelect',
    components: {
      Select,
      LoadingOutlined,
    },
    inheritAttrs: false,
    props: {
      value: { type: [Array, Object, String, Number] as PropType<SelectValue> },
      numberToString: propTypes.bool,
      api: {
        type: Function as PropType<(arg?: any) => Promise<any>>,
        default: null,
      },
      // api params
      params: propTypes.any.def({}),
      // support xxx.xxx.xx
      resultField: propTypes.string.def(''),
      labelField: propTypes.string.def('label'),
      valueField: propTypes.string.def('value'),
      immediate: propTypes.bool.def(true),
      alwaysLoad: propTypes.bool.def(false),
      options: {
        type: Array<OptionsItem>,
        default: [],
      },
      // search
      isSearch: propTypes.bool.def(false),
      searchField: propTypes.string,
      optionFilterProp: propTypes.string.def('label'),
    },
    emits: ['options-change', 'change', 'update:value'],
    setup(props, { emit }) {
      const options = ref<OptionsItem[]>([]);
      const loading = ref(false);
      // 首次是否加载过了
      const isFirstLoaded = ref(false);
      const emitData = ref<OptionsItem[]>([]);
      const attrs = useAttrs();
      const { t } = useI18n();
      const useSearch = props.isSearch;
      const searchFun = ref<any>();
      const filterOption = ref<boolean | FilterFunc<DefaultOptionType> | undefined>();
      const optionFilterProps = ref<string>();

      if (useSearch) {
        searchFun.value = searchFetch;
        filterOption.value = false;
      } else {
        filterOption.value = true;
        optionFilterProps.value = props.optionFilterProp;
      }

      // Embedded in the form, just use the hook binding to perform form verification
      const [state] = useRuleFormItem(props, 'value', 'change', emitData);

      const getOptions = computed(() => {
        const { labelField, valueField, numberToString } = props;

        let data = unref(options).reduce((prev, next: any) => {
          if (next) {
            const value = get(next, valueField);
            prev.push({
              ...omit(next, [labelField, valueField]),
              label: get(next, labelField),
              value: numberToString ? `${value}` : value,
            });
          }
          return prev;
        }, [] as OptionsItem[]);

        return data.length > 0 ? data : props.options;
      });

      watch(
        () => state.value,
        (v) => {
          emit('update:value', v);
        },
      );

      watch(
        () => props.params,
        () => {
          if (useSearch == false) {
            !unref(isFirstLoaded) && fetch();
          }
        },
        { deep: true, immediate: props.immediate },
      );

      async function fetch() {
        const api = props.api;
        if (!api || !isFunction(api) || loading.value) return;
        options.value = [];
        try {
          loading.value = true;

          const res = await api(props.params);
          isFirstLoaded.value = true;
          if (Array.isArray(res)) {
            options.value = res;
            emitChange();
            return;
          }
          if (props.resultField) {
            options.value = get(res, props.resultField) || [];
          }
          emitChange();
        } catch (error) {
          console.warn(error);
          // reset status
          isFirstLoaded.value = false;
        } finally {
          loading.value = false;
        }
      }

      async function searchFetch(value: string) {
        const api = props.api;
        if (!api || !isFunction(api) || loading.value) return;
        options.value = [];
        try {
          loading.value = true;

          let searchParam: any = {};

          if (props.searchField != undefined) {
            searchParam[props.searchField] = value;
          }

          searchParam['page'] = 1;
          searchParam['pageSize'] = 10;

          const res = await api(searchParam);
          if (Array.isArray(res)) {
            options.value = res;
            emitChange();
            return;
          }
          if (props.resultField) {
            options.value = get(res, props.resultField) || [];
          }

          emitChange();
        } catch (error) {
          console.warn(error);
        } finally {
          loading.value = false;
        }
      }

      async function handleFetch(visible: boolean) {
        if (visible && !useSearch) {
          if (props.alwaysLoad) {
            await fetch();
          } else if (!props.immediate && !unref(isFirstLoaded)) {
            await fetch();
          }
        }
      }

      function emitChange() {
        emit('options-change', unref(getOptions));
      }

      function handleChange(_, ...args) {
        emitData.value = args;
        emit('change', args);
      }

      return {
        state,
        attrs,
        getOptions,
        loading,
        t,
        handleFetch,
        handleChange,
        useSearch,
        searchFun,
        filterOption,
        optionFilterProps,
      };
    },
  });
</script>
