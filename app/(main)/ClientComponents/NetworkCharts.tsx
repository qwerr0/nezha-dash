"use client";

import NetworkChartLoading from "@/app/(main)/ClientComponents/NetworkChartLoading";
import { NezhaAPIMonitor } from "@/app/types/nezha-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import getEnv from "@/lib/env-entry";
import { nezhaFetcher } from "@/lib/utils";
import EChartsReact from "echarts-for-react";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

const NetworkLineChart = ({
  server_id,
  show,
}: {
  server_id: number;
  show: boolean;
}) => {
  const t = useTranslations("NetworkChartClient");
  const chartRef = useRef(null);
  const [option, setOption] = useState({
    ...options.lineChart,
    this: () => chartRef,
  });

  const { data, error } = useSWR<NezhaAPIMonitor[]>(
    `/api/monitor?server_id=${server_id}`,
    nezhaFetcher,
    {
      refreshInterval:
        Number(getEnv("NEXT_PUBLIC_NezhaFetchInterval")) || 15000,
      isVisible: () => show,
    },
  );

  const transformedData = useMemo(
    () => (data ? transformData(data) : []),
    [data],
  );

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.getEchartsInstance().resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const newOption = { ...option, this: () => chartRef };
    const deepSet = deepSetObj(newOption);
    deepSet(
      "legend.data",
      transformedData.map((item) => item.name),
    );
    deepSet(
      "legend.selected",
      Object.fromEntries(transformedData.map((item) => [item.name, false])),
    );
    deepSet(
      "series",
      transformedData.flatMap((item, index) => ({
        _: item,
        type: "line",
        smooth: false,
        large: true,
        animation: false,
        sampling: "lttb",
        name: item.name,
        symbol: symbols[Math.floor(index / 9) % symbols.length],
        data: item.validDelaysWithCreatedAt.map((item) => [
          item.created_at,
          item.delay,
        ]),
        lineStyle: { width: 1, opacity: 0.5 },
        markPoint: {
          label: { formatter: (v) => parseInt(v.value) },
          data: [
            { type: "max", symbol: "pin", name: item.name },
            { type: "min", symbol: "pin", name: item.name },
          ],
          data_: [],
        },
        emphasis: { lineStyle: { width: 2, opacity: 1, type: "solid" } },
        markLine: {
          symbol: ["none", "none"],
          tooltip: { show: false },
          emphasis: { lineStyle: { width: 2, opacity: 1, type: "solid" } },
          data:
            item.lossPercentage >= 100
              ? {}
              : item.lossWithCreatedAt.map((item) => ({
                  label: { show: false },
                  xAxis: item.created_at,
                  lineStyle: { type: "dotted", opacity: 0.5 },
                })),
        },
      })),
    );
    setOption(newOption);
  }, [transformedData]);

  if (error) {
    return (
      <>
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm font-medium opacity-40">{error.message}</p>
          <p className="text-sm font-medium opacity-40">
            {t("chart_fetch_error_message")}
          </p>
        </div>
        <NetworkChartLoading />
      </>
    );
  }
  if (!data) return <NetworkChartLoading />;

  return (
    <Card>
      <CardContent className="px-2 sm:p-6">
        <EChartsReact
          key="lineChart"
          ref={chartRef}
          option={option}
          style={{ height: "100%", minHeight: "950px", width: "100%" }}
        />
      </CardContent>
    </Card>
  );
};

const NetworkBoxplot = ({
  server_id,
  show,
}: {
  server_id: number;
  show: boolean;
}) => {
  const t = useTranslations("NetworkChartClient");
  const chartRef = useRef(null);
  const [option, setOption] = useState({
    ...options.boxplotChart,
    this: () => chartRef,
  });

  const { data, error } = useSWR<NezhaAPIMonitor[]>(
    `/api/monitor?server_id=${server_id}`,
    nezhaFetcher,
    {
      refreshInterval:
        Number(getEnv("NEXT_PUBLIC_NezhaFetchInterval")) || 15000,
      isVisible: () => show,
    },
  );

  const transformedData = useMemo(
    () => (data ? transformData(data) : []),
    [data],
  );

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.getEchartsInstance().resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const newOption = { ...option, this: () => chartRef };
    const deepSet = deepSetObj(newOption);

    deepSet(
      "yAxis.data",
      transformedData.map((item) => item.name),
    );
    deepSet("series.data_", transformedData);
    deepSet(
      "series.data",
      transformedData.map((item) => ({
        _: item.lossPercentage,
        value: [item.min, item.Q1, item.median, item.Q3, item.max],
        itemStyle: { borderColor: item.lossRateColor },
      })),
    );
    setOption(newOption);
  }, [transformedData]);

  if (error) {
    return (
      <>
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm font-medium opacity-40">{error.message}</p>
          <p className="text-sm font-medium opacity-40">
            {t("chart_fetch_error_message")}
          </p>
        </div>
        <NetworkChartLoading />
      </>
    );
  }

  return (
    <Card>
      <CardContent className="px-2 sm:p-6">
        <EChartsReact
          key="boxplotChart"
          ref={chartRef}
          option={option}
          style={{ height: "100%", minHeight: "1250px", width: "100%" }}
        />
      </CardContent>
    </Card>
  );
};

const NetworkDelaysHotmap = ({
  server_id,
  show,
}: {
  server_id: number;
  show: boolean;
}) => {
  const t = useTranslations("NetworkChartClient");
  const chartRef = useRef(null);
  const [option, setOption] = useState({
    ...options.hotmapDelayChart,
    this: () => chartRef,
  });

  const { data, error } = useSWR<NezhaAPIMonitor[]>(
    `/api/monitor?server_id=${server_id}`,
    nezhaFetcher,
    {
      refreshInterval:
        Number(getEnv("NEXT_PUBLIC_NezhaFetchInterval")) || 15000,
      isVisible: () => show,
    },
  );

  const transformedData = useMemo(
    () => (data ? transformData(data) : []),
    [data],
  );

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.getEchartsInstance().resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const newOption = { ...option, this: () => chartRef };
    const deepSet = deepSetObj(newOption);

    deepSet(
      "yAxis.data",
      transformedData.map((item) => item.name),
    );
    deepSet("series.data_", transformedData);
    deepSet(
      "series.data",
      transformedData.flatMap((item, index) =>
        item.delaysWithCreatedAt.map((d) => ({
          name: item.name,
          value: [d.created_at, index, d.delay],
        })),
      ),
    );
    setOption(newOption);
  }, [transformedData]);

  if (error) {
    return (
      <>
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm font-medium opacity-40">{error.message}</p>
          <p className="text-sm font-medium opacity-40">
            {t("chart_fetch_error_message")}
          </p>
        </div>
        <NetworkChartLoading />
      </>
    );
  }

  return (
    <Card>
      <CardContent className="px-2 sm:p-6">
        <EChartsReact
          key="hotmapDelayChart"
          ref={chartRef}
          option={option}
          style={{ height: "100%", minHeight: "1250px", width: "100%" }}
        />
      </CardContent>
    </Card>
  );
};

const NetworkLossHotmap = ({
  server_id,
  show,
}: {
  server_id: number;
  show: boolean;
}) => {
  const t = useTranslations("NetworkChartClient");
  const chartRef = useRef(null);
  const [option, setOption] = useState({
    ...options.hotmapLossChart,
    this: () => chartRef,
  });

  const { data, error } = useSWR<NezhaAPIMonitor[]>(
    `/api/monitor?server_id=${server_id}`,
    nezhaFetcher,
    {
      refreshInterval:
        Number(getEnv("NEXT_PUBLIC_NezhaFetchInterval")) || 15000,
      isVisible: () => show,
    },
  );

  const transformedData = useMemo(
    () => (data ? transformData(data, 0, 0, 60 * 10, 0, false) : []),
    [data],
  );

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.getEchartsInstance().resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const newOption = { ...option, this: () => chartRef };
    const deepSet = deepSetObj(newOption);

    deepSet(
      "yAxis.data",
      transformedData.map((item) => item.name),
    );
    deepSet("series.data_", transformedData);
    deepSet(
      "series.data",
      transformedData.flatMap((item, index) =>
        item.delaysWithCreatedAt.map((d) => ({
          name: item.name,
          value: [d.created_at, index, d.loss_rate * 100],
        })),
      ),
    );
    setOption(newOption);
  }, [transformedData]);

  if (error) {
    return (
      <>
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm font-medium opacity-40">{error.message}</p>
          <p className="text-sm font-medium opacity-40">
            {t("chart_fetch_error_message")}
          </p>
        </div>
        <NetworkChartLoading />
      </>
    );
  }

  return (
    <Card>
      <CardContent className="px-2 sm:p-6">
        <EChartsReact
          key="hotmapLossChart"
          ref={chartRef}
          option={option}
          style={{ height: "100%", minHeight: "1250px", width: "100%" }}
        />
      </CardContent>
    </Card>
  );
};

export {
  NetworkLineChart,
  NetworkBoxplot,
  NetworkDelaysHotmap,
  NetworkLossHotmap,
};

const deepSetObj = (obj) => {
  return function deepSet(path, value) {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  };
};
const transformData = (
  data: NezhaAPIMonitor[],
  startTime = 0,
  endTime = 0,
  resampleInterval = 0,
  maxResamplePacketLossRate = 0,
  resampleUseAvgInsteadOfMeanDelay = false,
) => {
  function getMedianPercentile(data, percentile) {
    const index = (percentile / 100) * (data.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= data.length) return data[lower];
    return data[lower] * (1 - weight) + data[upper] * weight;
  }
  function resampleDelaysWithCreatedAt(
    delaysWithCreatedAt,
    intervalMs,
    maxPacketLossRate,
    useAvgInsteadOfMeanDelay,
  ) {
    delaysWithCreatedAt.sort((a, b) => a.created_at - b.created_at);
    const resampledData = [];
    let currentBucket = [];
    let bucketStart =
      Math.floor(delaysWithCreatedAt[0].created_at / intervalMs) * intervalMs;
    function updateResampledData(
      currentBucket,
      resampledData,
      maxPacketLossRate,
    ) {
      let delay;
      if (useAvgInsteadOfMeanDelay) {
        delay =
          currentBucket.reduce((sum, d) => sum + d.delay, 0) /
          currentBucket.length;
      } else {
        delay = getMedianPercentile(
          currentBucket.map((d) => d.delay),
          50,
        );
      }
      const packetLossRate =
        currentBucket.filter((d) => d.delay >= MaxTCPPingValue).length /
        currentBucket.length;
      resampledData.push({
        created_at: bucketStart,
        delay: packetLossRate > maxPacketLossRate ? MaxTCPPingValue : delay,
        loss_rate: packetLossRate,
      });
    }
    for (const point of delaysWithCreatedAt) {
      if (point.created_at >= bucketStart + intervalMs) {
        if (currentBucket.length > 0) {
          updateResampledData(currentBucket, resampledData, maxPacketLossRate);
          currentBucket = [];
        }
        bucketStart = Math.floor(point.created_at / intervalMs) * intervalMs;
      }
      currentBucket.push(point);
    }
    if (currentBucket.length > 0) {
      updateResampledData(currentBucket, resampledData, maxPacketLossRate);
      currentBucket = [];
    }
    return resampledData;
  }
  function lossRateColorMap(lossRate, colorRanges) {
    const range = colorRanges.find(
      (range) => lossRate >= range.min && lossRate <= range.max,
    );
    return range ? range.color : colorRanges[colorRanges.length - 1].color;
  }
  return data.map((item) => {
    // 格式化延迟数据，异常值的延迟视作`MaxTCPPingValue`毫秒。
    let delaysWithCreatedAt = item.avg_delay.map((delay, index) => ({
      delay: delay > 0 && delay < MaxTCPPingValue ? delay : MaxTCPPingValue,
      created_at: item.created_at[index],
      loss_rate: delay > 0 && delay < MaxTCPPingValue ? 0 : 1,
    }));
    // 若指定时间参数则过滤对应的数据范围，否则则计算出数据的时间范围。
    if (startTime > 0) {
      delaysWithCreatedAt = delaysWithCreatedAt.filter(
        (item) => item.created_at >= startTime,
      );
    } else {
      startTime = item.created_at.reduce((min, current) =>
        Math.min(min, current),
      );
    }
    if (endTime > 0 && endTime > startTime) {
      delaysWithCreatedAt = delaysWithCreatedAt.filter(
        (item) => item.created_at <= endTime,
      );
    } else {
      endTime = item.created_at.reduce((max, current) =>
        Math.max(max, current),
      );
    }
    // 若指定重采样参数，则根据间隔重采样数据。
    // 参数`resampleInterval`单位是秒。
    // 异常值比例高于`maxResamplePacketLossRate`时视作异常值，否则计算延迟平均值。
    // 参数`resampleUseAvgInsteadOfMeanDelay`为真时计算延迟平均数而不是中位数。
    if (resampleInterval > 0) {
      delaysWithCreatedAt = resampleDelaysWithCreatedAt(
        delaysWithCreatedAt,
        resampleInterval * 1000,
        maxResamplePacketLossRate,
        resampleUseAvgInsteadOfMeanDelay,
      );
    }
    // 取出正常值和异常值，计算正常值的最小数、最大数、中位数、平均数、方差、标准差、Q1和Q3。
    const validDelaysWithCreatedAt = delaysWithCreatedAt.filter(
      ({ delay }) => delay < MaxTCPPingValue,
    );
    const lossWithCreatedAt = delaysWithCreatedAt.filter(
      ({ delay }) => delay >= MaxTCPPingValue,
    );
    const totalPoints = item.avg_delay.length;
    const validPoints = validDelaysWithCreatedAt.length;
    const validPercentage = (validPoints / totalPoints) * 100;
    const lossPoints = lossWithCreatedAt.length;
    const lossPercentage = (lossPoints / totalPoints) * 100;
    const validDelays = validDelaysWithCreatedAt.map((item) => item.delay);
    const sortedValidDelays = [...validDelays].sort((a, b) => a - b);
    const min = sortedValidDelays[0];
    const max = sortedValidDelays[validPoints - 1];
    const mean =
      sortedValidDelays.reduce((sum, current) => sum + current, 0) /
      validPoints;
    const variance =
      sortedValidDelays.reduce((sum, value) => {
        const diff = value - mean;
        return sum + diff * diff;
      }, 0) / validPoints;
    const standardDeviation = Math.sqrt(variance);
    const Q1 = getMedianPercentile(sortedValidDelays, 25);
    const median = getMedianPercentile(sortedValidDelays, 50);
    const Q3 = getMedianPercentile(sortedValidDelays, 75);
    const lossRateColor = lossRateColorMap(
      lossPercentage * 100,
      lossRateColorRanges,
    );

    return {
      name: item.monitor_name,
      monitor_id: item.monitor_id,
      server_id: item.server_id,
      monitor_name: item.monitor_name,
      server_name: item.server_name,
      created_at: item.created_at,
      avg_delay: item.avg_delay,
      startTime,
      endTime,
      totalPoints,
      validPoints,
      validPercentage,
      lossPoints,
      lossPercentage,
      delaysWithCreatedAt,
      validDelaysWithCreatedAt,
      lossWithCreatedAt,
      min,
      max,
      mean,
      variance,
      standardDeviation,
      Q1,
      median,
      Q3,
      hasValid: validPoints > 0,
      hasLoss: lossPoints > 0,
      lossRateColor,
    };
  });
};
const handleToolbox = (e, i, n) => {
  let option = {};
  let notMerge = false;
  let deepSet = deepSetObj(option);
  switch (n) {
    case "myOpenAllLegends":
      deepSet(
        "legend.selected",
        Object.fromEntries(e.option.series.map((item) => [item.name, true])),
      );
      break;
    case "myCloseAllLegends":
      deepSet(
        "legend.selected",
        Object.fromEntries(e.option.series.map((item) => [item.name, false])),
      );
      break;
    case "myOpenDefaultLegends":
      deepSet(
        "legend.selected",
        Object.fromEntries(
          e.option.series.map((item) => [
            item.name,
            item._.hasLoss || item._.variance > 50,
          ]),
        ),
      );
      break;
    case "myTimeRange":
      const startPrompt = prompt("请输入起始值（0-100）：");
      const endPrompt = prompt("请输入结束值（0-100）：");

      if (startPrompt !== null && endPrompt !== null) {
        const start = parseFloat(startPrompt);
        const end = parseFloat(endPrompt);
        const startTime = e.option.series[0].data_
          .map((i) => i.startTime)
          .reduce((min, current) => Math.min(min, current));
        const endTime = e.option.series[0].data_
          .map((i) => i.endTime)
          .reduce((max, current) => Math.max(max, current));
        const totalRange = endTime - startTime;
        const startFrom = startTime + (totalRange * start) / 100;
        const endTo = startTime + (totalRange * end) / 100;

        if (
          !isNaN(start) &&
          !isNaN(end) &&
          start >= 0 &&
          end <= 100 &&
          start < end
        ) {
          deepSet(
            "series.data",
            transformData(e.option.series[0].data_, startFrom, endTo).map(
              (item) => ({
                _: item.lossPercentage,
                value: [item.min, item.Q1, item.median, item.Q3, item.max],
                itemStyle: {
                  borderColor: item.lossRateColor,
                },
              }),
            ),
          );
        } else {
          alert("输入无效，请输入0到100之间的数值，且起始值小于结束值。");
        }
      }
      break;
    case "myResample":
      const intervalPrompt = prompt("请输入重采样间隔（单位秒）：");
      if (intervalPrompt !== null) {
        const interval = parseInt(intervalPrompt);
        if (!isNaN(interval) && interval >= 1) {
          const resampledData = transformData(
            e.option.series[0].data_,
            0,
            0,
            interval,
            0,
            false,
          );
          deepSet(
            "series.data",
            resampledData.flatMap((item, index) =>
              item.delaysWithCreatedAt.map((d) => ({
                name: item.name,
                value: [d.created_at, index, d.loss_rate * 100],
              })),
            ),
          );
          deepSet("xAxis", {});
        } else {
          alert("输入无效，请输入大于0的整数。");
        }
      }
      break;
    case "myToggleMarkPoints":
      deepSet(
        "series",
        e.option.series.map((i) => {
          const a = i.markPoint.data;
          const b = i.markPoint.data_;
          i.markPoint.data = b;
          i.markPoint.data_ = a;
          return i;
        }),
      );
      break;
    default:
      console.warn(e, i, n);
  }
  e.option.this().current.getEchartsInstance().setOption(option, notMerge);
};
const LineChartFormatter = (params) => {
  try {
    if (params.componentType === "markPoint") {
      const category = params.data.name;
      const delay = params.data.value.toFixed(floatToFixed);
      const type = params.data.type;
      const { year, month, day, hours, minutes, seconds } = dateFormatter(
        params.data.coord[0],
      );
      return `${category} ${delay}ms (${type})<br/>${year}-${month}-${day} ${hours}:${minutes}`;
    }
    const category = params.seriesName;
    const { year, month, day, hours, minutes, seconds } = dateFormatter(
      params.data[0],
    );
    const delay = params.data[1].toFixed(floatToFixed);
    return `${category} ${delay}ms<br/>${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    return;
  }
};
const BoxPlotFormatter = (params) => {
  try {
    const category = params.name;
    const [min, Q1, median, Q3, max] = params.data.value.map((i) =>
      i.toFixed(floatToFixed),
    );
    const lossRate = (params.data._ * 100).toFixed(floatToFixed);
    return `${category}<br/> min: ${min}ms<br/>  Q1: ${Q1}ms<br/> med: ${median}ms<br/>  Q3: ${Q3}ms<br/> max: ${max}ms<br/> loss: ${lossRate}%`;
  } catch (error) {
    return;
  }
};
const dateFormatter = (timestamp) => {
  const date = new Date(parseInt(timestamp));
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return { year, month, day, hours, minutes, seconds };
};
const xAxisDateFormatter = (value) => {
  const { year, month, day, hours, minutes, seconds } = dateFormatter(value);
  return `${hours}:${minutes}\n${day}`;
};
const HotmapFormatter = (params) => {
  try {
    const category = params.name;
    const { year, month, day, hours, minutes, seconds } = dateFormatter(
      params.data.value[0],
    );
    const data = params.data.value[2].toFixed(floatToFixed);
    return `${category} ${data}<br/>${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    return;
  }
};

const MaxTCPPingValue = 1000;
const floatToFixed = 2;
const lossRateColorRanges = [
  { min: 0, max: 0, color: "#24aa1d" },
  { min: 0, max: 1, color: "#42dd3f" },
  { min: 1, max: 2, color: "#bef663" },
  { min: 2, max: 10, color: "#f6ed44" },
  { min: 10, max: 99.9, color: "#f69833" },
  { min: 99.9, max: 100, color: "#e61610" },
];
const delayColorRanges = [
  { min: 0, max: 50, color: "#24aa1d" },
  { min: 50, max: 100, color: "#42dd3f" },
  { min: 100, max: 200, color: "#bef663" },
  { min: 200, max: 250, color: "#f6ed44" },
  { min: 250, max: MaxTCPPingValue - 1, color: "#f69833" },
  { min: MaxTCPPingValue - 1, max: MaxTCPPingValue, color: "#e61610" },
];
const closeSVGPath =
  "path://M9.5 14.5L11.9926 12M14.5 9.5L11.9926 12M11.9926 12L9.5 9.5M11.9926 12L14.5 14.5 M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.8214 2.48697 15.5291 3.33782 17L2.5 21.5L7 20.6622C8.47087 21.513 10.1786 22 12 22Z";
const openSVGPath =
  "path://M8 12L11 15L16 10 M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.8214 2.48697 15.5291 3.33782 17L2.5 21.5L7 20.6622C8.47087 21.513 10.1786 22 12 22Z";
const openDefaultSVGPath =
  "path://M17 12.5C17.2761 12.5 17.5 12.2761 17.5 12C17.5 11.7239 17.2761 11.5 17 11.5C16.7239 11.5 16.5 11.7239 16.5 12C16.5 12.2761 16.7239 12.5 17 12.5Z M12 12.5C12.2761 12.5 12.5 12.2761 12.5 12C12.5 11.7239 12.2761 11.5 12 11.5C11.7239 11.5 11.5 11.7239 11.5 12C11.5 12.2761 11.7239 12.5 12 12.5Z M7 12.5C7.27614 12.5 7.5 12.2761 7.5 12C7.5 11.7239 7.27614 11.5 7 11.5C6.72386 11.5 6.5 11.7239 6.5 12C6.5 12.2761 6.72386 12.5 7 12.5Z M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.8214 2.48697 15.5291 3.33782 17L2.5 21.5L7 20.6622C8.47087 21.513 10.1786 22 12 22Z";
const TimeRangeSVGPath =
  "path://M3.25 20C3.11193 20 3 19.8881 3 19.75V4.25C3 4.11193 3.11193 4 3.25 4C3.38807 4 3.5 4.11193 3.5 4.25V19.75C3.5 19.8881 3.38807 20 3.25 20ZM16.5 19.75C16.5 19.8881 16.6119 20 16.75 20C16.8881 20 17 19.8881 17 19.75V4.25C17 4.11193 16.8881 4 16.75 4C16.6119 4 16.5 4.11193 16.5 4.25V19.75ZM9 6.5C8.17157 6.5 7.5 7.17157 7.5 8V16C7.5 16.8284 8.17157 17.5 9 17.5H11C11.8284 17.5 12.5 16.8284 12.5 16V8C12.5 7.17157 11.8284 6.5 11 6.5H9ZM8.25 8C8.25 7.58579 8.58579 7.25 9 7.25H11C11.4142 7.25 11.75 7.58579 11.75 8V16C11.75 16.4142 11.4142 16.75 11 16.75H9C8.58579 16.75 8.25 16.4142 8.25 16V8Z";
const toggleSVGPath =
  "path://M50 10a20 20 0 0 1 20 20c0 11-20 45-20 45s-20-34-20-45a20 20 0 0 1 20-20z";
const symbols = [
  "circle",
  "rect",
  "roundRect",
  "triangle",
  "diamond",
  "pin",
  "arrow",
];
const configs = `
  lineChart.show=true;
  #lineChart.title.text='折线图';
  lineChart.title.textStyle.fontSize=20;
  lineChart.legend.show=true;
  lineChart.legend.data=[];
  lineChart.legend.selected={};
  lineChart.grid.show=true;
  lineChart.grid.containLabel=true;
  lineChart.xAxis.show=true;
  lineChart.yAxis.show=true;
  lineChart.xAxis.splitLine.show=false;
  lineChart.yAxis.splitLine.show=false;
  lineChart.xAxis.type='time';
  lineChart.yAxis.type='value';
  lineChart.yAxis.min=0;
  lineChart.yAxis.max=MaxTCPPingValue;
  lineChart.tooltip.show=true;
  lineChart.tooltip.confine=true;
  lineChart.tooltip.trigger='item';
  lineChart.tooltip.axisPointer.type='cross';
  lineChart.tooltip.formatter=LineChartFormatter;
  lineChart.toolbox.feature.restore.show=true;
  lineChart.toolbox.feature.dataZoom.show=true;
  lineChart.toolbox.feature.dataZoom.xAxisIndex=true;
  lineChart.toolbox.feature.dataView.show=true;
  lineChart.toolbox.feature.saveAsImage.show=true;
  lineChart.emphasis.focus='series';
  lineChart.dataZoom=[{ type: 'slider', start: 0, end: 100, bottom: '160px', right: '5px', show: true }, { type: 'inside', start: 0, end: 100 }];
  lineChart.title.left='center';
  lineChart.legend.bottom='0';
  lineChart.grid.up='0';
  lineChart.grid.left='0';
  lineChart.grid.right='0';
  lineChart.grid.bottom='200px';
  lineChart.toolbox.right='0';
  lineChart.toolbox.feature.myCloseAllLegends.show=true;
  lineChart.toolbox.feature.myCloseAllLegends.title='Close All Legends';
  lineChart.toolbox.feature.myCloseAllLegends.icon=closeSVGPath;
  lineChart.toolbox.feature.myCloseAllLegends.onclick=handleToolbox;
  lineChart.toolbox.feature.myOpenAllLegends.show=true;
  lineChart.toolbox.feature.myOpenAllLegends.title='Open All Legends';
  lineChart.toolbox.feature.myOpenAllLegends.icon=openSVGPath;
  lineChart.toolbox.feature.myOpenAllLegends.onclick=handleToolbox;
  lineChart.toolbox.feature.myOpenDefaultLegends.title='Open Default Legends';
  lineChart.toolbox.feature.myOpenDefaultLegends.icon=openDefaultSVGPath;
  lineChart.toolbox.feature.myOpenDefaultLegends.onclick=handleToolbox;
  lineChart.toolbox.feature.myToggleMarkPoints.title='Toggle Mark Points';
  lineChart.toolbox.feature.myToggleMarkPoints.icon=toggleSVGPath;
  lineChart.toolbox.feature.myToggleMarkPoints.onclick=handleToolbox;
  lineChart.series=[];

  boxplotChart.show=true;
  #boxplotChart.title.text='箱线图';
  boxplotChart.title.textStyle.fontSize=20;
  boxplotChart.legend.show=false;
  boxplotChart.grid.show=true;
  boxplotChart.grid.containLabel=true;
  boxplotChart.xAxis.show=true;
  boxplotChart.yAxis.show=true;
  boxplotChart.xAxis.splitLine.show=false;
  boxplotChart.yAxis.splitLine.show=true;
  boxplotChart.xAxis.type='value';
  boxplotChart.yAxis.type='category';
  boxplotChart.yAxis.inverse=true;
  boxplotChart.yAxis.data=[];
  boxplotChart.xAxis.min=0;
  boxplotChart.xAxis.max=MaxTCPPingValue;
  boxplotChart.tooltip.show=true;
  boxplotChart.tooltip.confine=true;
  boxplotChart.tooltip.trigger='item';
  boxplotChart.tooltip.axisPointer.type='cross';
  boxplotChart.tooltip.formatter=BoxPlotFormatter;
  boxplotChart.toolbox.feature.restore.show=true;
  boxplotChart.toolbox.feature.dataZoom.show=true;
  boxplotChart.toolbox.feature.dataZoom.yAxisIndex=true;
  boxplotChart.toolbox.feature.saveAsImage.show=true;
  boxplotChart.dataZoom=[{ type: 'slider', start: 0, end: 100, orient: 'vertical', right: '10px', show: true }, { type: 'inside', start: 0, end: 100, orient: 'vertical' }];
  boxplotChart.title.left='center';
  boxplotChart.grid.up='0';
  boxplotChart.grid.left='0';
  boxplotChart.grid.right='50px';
  boxplotChart.grid.bottom='10px';
  boxplotChart.toolbox.right='50px';
  boxplotChart.series.type='boxplot';
  boxplotChart.toolbox.feature.myTimeRange.title='Time Range';
  boxplotChart.toolbox.feature.myTimeRange.icon=TimeRangeSVGPath;
  boxplotChart.toolbox.feature.myTimeRange.onclick=handleToolbox;
  boxplotChart.series.data_=[];
  boxplotChart.series.data=[];

  hotmapDelayChart.show=true;
  #hotmapDelayChart.title.text='热力图(延迟)';
  hotmapDelayChart.title.textStyle.fontSize=20;
  hotmapDelayChart.legend.show=false;
  hotmapDelayChart.grid.show=true;
  hotmapDelayChart.grid.containLabel=true;
  hotmapDelayChart.xAxis.show=true;
  hotmapDelayChart.yAxis.show=true;
  hotmapDelayChart.xAxis.splitLine.show=false;
  hotmapDelayChart.yAxis.splitLine.show=true;
  hotmapDelayChart.xAxis.type='category';
  hotmapDelayChart.yAxis.type='category';
  hotmapDelayChart.yAxis.inverse=true;
  hotmapDelayChart.yAxis.data=[];
  hotmapDelayChart.xAxis.axisLabel.formatter=xAxisDateFormatter;
  hotmapDelayChart.tooltip.show=true;
  hotmapDelayChart.tooltip.confine=true;
  hotmapDelayChart.tooltip.trigger='item';
  hotmapDelayChart.tooltip.axisPointer.type='none';
  hotmapDelayChart.tooltip.formatter=HotmapFormatter;
  hotmapDelayChart.toolbox.feature.restore.show=true;
  hotmapDelayChart.toolbox.feature.dataZoom.show=true;
  hotmapDelayChart.toolbox.feature.dataZoom.xAxisIndex=true;
  hotmapDelayChart.toolbox.feature.saveAsImage.show=true;
  hotmapDelayChart.visualMap.show=true;
  hotmapDelayChart.visualMap.type='piecewise';
  hotmapDelayChart.visualMap.min=0;
  hotmapDelayChart.visualMap.max=MaxTCPPingValue;
  hotmapDelayChart.visualMap.calculable=true;
  hotmapDelayChart.visualMap.pieces=delayColorRanges;
  hotmapDelayChart.dataZoom=[{ type: 'slider', start: 0, end: 100, bottom: '10px', show: true }, { type: 'inside', start: 0, end: 100 }];
  hotmapDelayChart.title.left='center';
  hotmapDelayChart.visualMap.orient='vertical';
  hotmapDelayChart.visualMap.up='center';
  hotmapDelayChart.visualMap.bottom='center';
  hotmapDelayChart.visualMap.right='0';
  hotmapDelayChart.visualMap.inverse=true;
  hotmapDelayChart.visualMap.align='left';
  hotmapDelayChart.grid.up='0';
  hotmapDelayChart.grid.left='0';
  hotmapDelayChart.grid.right='110px';
  hotmapDelayChart.grid.bottom='50px';
  hotmapDelayChart.toolbox.right='110px';
  hotmapDelayChart.series.type='heatmap';
  hotmapDelayChart.series.emphasis.itemStyle.borderColor='#333';
  hotmapDelayChart.series.emphasis.itemStyle.borderWidth=0.01;
  hotmapDelayChart.series.data_=[];
  hotmapDelayChart.series.data=[];

  hotmapLossChart.show=true;
  #hotmapLossChart.title.text='热力图(丢包率)';
  hotmapLossChart.title.textStyle.fontSize=20;
  hotmapLossChart.legend.show=false;
  hotmapLossChart.grid.show=true;
  hotmapLossChart.grid.containLabel=true;
  hotmapLossChart.xAxis.show=true;
  hotmapLossChart.yAxis.show=true;
  hotmapLossChart.xAxis.splitLine.show=false;
  hotmapLossChart.yAxis.splitLine.show=true;
  hotmapLossChart.xAxis.type='category';
  hotmapLossChart.yAxis.type='category';
  hotmapLossChart.yAxis.inverse=true;
  hotmapLossChart.yAxis.data=[];
  hotmapLossChart.xAxis.axisLabel.formatter=xAxisDateFormatter;
  hotmapLossChart.tooltip.show=true;
  hotmapLossChart.tooltip.confine=true;
  hotmapLossChart.tooltip.trigger='item';
  hotmapLossChart.tooltip.axisPointer.type='none';
  hotmapLossChart.tooltip.formatter=HotmapFormatter;
  hotmapLossChart.toolbox.feature.restore.show=true;
  hotmapLossChart.toolbox.feature.dataZoom.show=true;
  hotmapLossChart.toolbox.feature.dataZoom.xAxisIndex=true;
  hotmapLossChart.toolbox.feature.saveAsImage.show=true;
  hotmapLossChart.visualMap.show=true;
  hotmapLossChart.visualMap.type='piecewise';
  hotmapLossChart.visualMap.min=0;
  hotmapLossChart.visualMap.max=100;
  hotmapLossChart.visualMap.calculable=true;
  hotmapLossChart.visualMap.pieces=lossRateColorRanges;
  hotmapLossChart.dataZoom=[{ type: 'slider', start: 0, end: 100, bottom: '10px', show: true }, { type: 'inside', start: 0, end: 100 }];
  hotmapLossChart.title.left='center';
  hotmapLossChart.visualMap.orient='vertical';
  hotmapLossChart.visualMap.up='center';
  hotmapLossChart.visualMap.bottom='center';
  hotmapLossChart.visualMap.right='10px';
  hotmapLossChart.visualMap.inverse=true;
  hotmapLossChart.visualMap.align='left';
  hotmapLossChart.grid.up='0';
  hotmapLossChart.grid.left='0';
  hotmapLossChart.grid.right='110px';
  hotmapLossChart.grid.bottom='50px';
  hotmapLossChart.toolbox.right='110px';
  hotmapLossChart.series.type='heatmap';
  hotmapLossChart.series.emphasis.itemStyle.borderColor='#333';
  hotmapLossChart.series.emphasis.itemStyle.borderWidth=0.01;
  hotmapLossChart.toolbox.feature.myResample.title='Time Resample';
  hotmapLossChart.toolbox.feature.myResample.icon=TimeRangeSVGPath;
  hotmapLossChart.toolbox.feature.myResample.onclick=handleToolbox;
  hotmapLossChart.series.data_=[];
  hotmapLossChart.series.data=[];
`;
const options = ((configs_) => {
  let configs = configs_ + "\n";
  let options = {};
  configs
    .split(";\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .forEach((config) => {
      if (config.startsWith("#")) {
        return;
      }
      try {
        const match = config.match(/^(\w+)\.(.+?)=(.+)$/);
        const [, chartString, property, valueString] = match;
        const value = eval(`${valueString}`);
        const chartOption =
          options[chartString] ?? (options[chartString] = { this: () => {} });
        deepSetObj(chartOption)(property, value);
      } catch (error) {
        console.error(`Error parsing value for ${config}: ${error.message}`);
        return;
      }
    });
  return options;
})(configs);
