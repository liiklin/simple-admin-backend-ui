<template>
  <Select
    @dropdown-visible-change="handleFetch"
    v-bind="$attrs"
    @change="handleChange"
    :options="getOptions"
    mode="multiple"
    v-model:value="state as any"
    :filter-option="filterOption"
    @search="searchFun"
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
  import { defineComponent, PropType, ref, watchEffect, computed, unref, watch } from 'vue';
  import { Select } from 'ant-design-vue';
  import { useRuleFormItem } from '@/hooks/component/useFormItem';
  import { useAttrs } from '@vben/hooks';
  import { LoadingOutlined } from '@ant-design/icons-vue';
  import { useI18n } from '@/hooks/web/useI18n';
  import { propTypes } from '@/utils/propTypes';
  import { isFunction, omit } from 'remeda';
  import { get } from '/@/utils/object';
  import { DefaultOptionType, FilterFunc } from 'ant-design-vue/lib/vc-select/Select';

  type OptionsItem = { label: string; value: string; disabled?: boolean };

  export default defineComponent({
    name: 'ApiMultipleSelect',
    components: {
      Select,
      LoadingOutlined,
    },
    inheritAttrs: false,
    props: {
      value: [Array, Object, String, Number],
      numberToString: propTypes.bool,
      api: {
        type: Function as Function as PropType<(arg?: any) => Promise<any>>,
        default: null,
      },
      // api params
      params: {
        type: Object as PropType<Recordable>,
        default: () => ({}),
      },
      // support xxx.xxx.xx
      resultField: propTypes.string.def(''),
      labelField: propTypes.string.def('label'),
      valueField: propTypes.string.def('value'),
      immediate: propTypes.bool.def(true),
      alwaysLoad: propTypes.bool.def(false),
      // search
      isSearch: propTypes.bool.def(false),
      searchField: propTypes.string,
      optionFilterProp: propTypes.string.def('label'),
    },
    emits: ['options-change', 'change', 'update:value'],
    setup(props, { emit }) {
      const options = ref<OptionsItem[]>([]);
      const loading = ref(false);
      const isFirstLoad = ref(true);
      const emitData = ref<any[]>([]);
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

        return unref(options).reduce((prev, next: Recordable) => {
          if (next) {
            const value = next[valueField];
            prev.push({
              ...omit(next, [labelField, valueField]),
              label: next[labelField],
              value: numberToString ? `${value}` : value,
            });
          }
          return prev;
        }, [] as OptionsItem[]);
      });

      watchEffect(() => {
        props.immediate && !props.alwaysLoad && fetch();
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
          !unref(isFirstLoad) && fetch();
        },
        { deep: true },
      );

      async function fetch() {
        const api = props.api;
        if (!api || !isFunction(api)) return;
        options.value = [];
        try {
          loading.value = true;
          const res = await api(props.params);
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

      async function handleFetch(visible) {
        if (visible) {
          if (props.alwaysLoad) {
            await fetch();
          } else if (!props.immediate && unref(isFirstLoad)) {
            await fetch();
            isFirstLoad.value = false;
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
        filterOption,
        useSearch,
        searchFun,
        optionFilterProps,
      };
    },
  });
</script>
