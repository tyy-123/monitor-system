<script setup>
import { ref, onMounted, nextTick, watch } from "vue";
import * as echarts from "echarts";
import IconPicture from "../components/icons/IconPicture.vue";
import IconExcel from "../components/icons/IconExcel.vue";
import { monitorApi } from "@/api";
import { ElMessage, ElLoading } from "element-plus";

// 部门数据
const departmentData = ref([]);
// 监测点数据映射表 { departmentId: [points] }
const pointDataMap = ref({});
// 树形数据
const treeData = ref([]);

// 树组件实例
const treeRef = ref(null);
// 当前选中的节点key
const currentNodeKey = ref("");
// 当前选中的监测点
const currentMonitor = ref("");
// 当前选中的监测点编号
const currentpPointCode = ref("");
// 当前选中的参数列表
const selectedParams = ref([]);
// 时间范围
const timeRange = ref(["2023-12-11 00:00:00", "2023-12-11 23:59:59"]);
// 图表实例
let chartInstance = null;
// 当前显示的图表数据
const currentChartData = ref([]);
// 图表是否已初始化
const chartInitialized = ref(false);
// 导出加载状态
const exportLoading = ref(false);

// 获取部门数据
const getDepartmentData = async () => {
  const loading = ElLoading.service({
    lock: true,
    text: "加载部门数据中...",
    background: "rgba(0, 0, 0, 0.7)",
  });

  try {
    const res = await monitorApi.getDepartmentTree();
    departmentData.value = res;

    // 获取所有部门的监测点
    await getAllDepartmentPoints();

    // 构建树形结构
    buildTreeData();

    // 初始化时查询数据
    await handleQuery();
  } catch (error) {
    ElMessage.error("获取部门列表失败");
    console.error("获取部门数据失败:", error);
  } finally {
    loading.close();
  }
};

// 获取指定部门的监测点
const getDepartmentPoints = async (departmentId) => {
  try {
    const res = await monitorApi.getPointDepartment(departmentId);
    console.log(`部门 ${departmentId} 的监测点:`, res);
    return res;
  } catch (error) {
    console.error(`获取部门 ${departmentId} 的监测点失败:`, error);
    return [];
  }
};

// 获取所有部门的监测点
const getAllDepartmentPoints = async () => {
  const pointMap = {};

  // 提取所有部门ID（包括子部门）
  const departmentIds = [];
  const extractDepartmentIds = (departments) => {
    if (!departments || !Array.isArray(departments)) return;

    departments.forEach((dept) => {
      if (dept && dept.id) {
        departmentIds.push(dept.id);
        if (dept.children && dept.children.length > 0) {
          extractDepartmentIds(dept.children);
        }
      }
    });
  };

  extractDepartmentIds(departmentData.value);

  // 并行获取所有部门的监测点
  const promises = departmentIds.map(async (deptId) => {
    const points = await monitorApi.getPointDepartment(deptId);
    pointMap[deptId] = points || [];
  });

  await Promise.all(promises);
  pointDataMap.value = pointMap;
};

// 构建树形数据
const buildTreeData = () => {
  const buildTree = (departments) => {
    if (!departments || !Array.isArray(departments)) return [];

    return departments
      .map((dept) => {
        if (!dept || !dept.id) return null;

        const node = {
          id: dept.id.toString(),
          label: dept.name,
          type: "department",
          departmentId: dept.id,
        };

        // 如果有子部门，递归构建
        if (dept.children && dept.children.length > 0) {
          const children = buildTree(dept.children);
          if (children && children.length > 0) {
            node.children = children;
          }
        }
        // 如果是叶子部门（供电线），添加监测点
        else if (
          pointDataMap.value[dept.id] &&
          pointDataMap.value[dept.id].length > 0
        ) {
          node.children = pointDataMap.value[dept.id].map((point) => ({
            ...point,
            id: `point-${point.id}`,
            label: point.name,
            type: "point",
            pointId: point.id,
            pointCode: point.pointCode,
            departmentId: dept.id,
            children: [
              {
                id: `param-${point.id}-temp`,
                label: "温度",
                type: "param",
                pointId: point.id,
                pointCode: point.pointCode,
                isLeaf: true,
                checked: false,
              },
              {
                id: `param-${point.id}-humi`,
                label: "湿度",
                type: "param",
                pointId: point.id,
                pointCode: point.pointCode,
                isLeaf: true,
                checked: false,
              },
              {
                id: `param-${point.id}-ice1`,
                label: "上覆冰",
                type: "param",
                pointId: point.id,
                pointCode: point.pointCode,
                isLeaf: true,
                checked: false,
              },
              {
                id: `param-${point.id}-ice2`,
                label: "下覆冰",
                type: "param",
                pointId: point.id,
                pointCode: point.pointCode,
                isLeaf: true,
                checked: false,
              },
            ],
          }));
        }

        return node;
      })
      .filter(Boolean);
  };

  const rootChildren = buildTree(departmentData.value);
  treeData.value = rootChildren;

  console.log("构建的树形数据:", treeData.value);
};

// 设置指定监测点的参数选中状态
const setPointParamsChecked = (pointId, checked) => {
  const setPointChecked = (nodes) => {
    if (!nodes || !Array.isArray(nodes)) return;

    nodes.forEach((node) => {
      if (node.type === "param" && node.pointId === pointId) {
        node.checked = checked;
      }
      if (node.children && Array.isArray(node.children)) {
        setPointChecked(node.children);
      }
    });
  };

  setPointChecked(treeData.value);
};

// 获取指定监测点的所有参数ID
const getPointParamIds = (pointId) => {
  const paramIds = [];
  const collectParamIds = (nodes) => {
    if (!nodes || !Array.isArray(nodes)) return;

    nodes.forEach((node) => {
      if (node.type === "param" && node.pointId === pointId) {
        paramIds.push(node.id);
      }
      if (node.children && Array.isArray(node.children)) {
        collectParamIds(node.children);
      }
    });
  };

  collectParamIds(treeData.value);
  return paramIds;
};

// 清空其他监测点的选中状态（保留指定监测点）
const clearOtherMonitorParams = (keepPointId) => {
  const clearOther = (nodes) => {
    if (!nodes || !Array.isArray(nodes)) return;

    nodes.forEach((node) => {
      if (node.type === "param" && node.pointId !== keepPointId) {
        node.checked = false;
      }
      if (node.children && Array.isArray(node.children)) {
        clearOther(node.children);
      }
    });
  };

  clearOther(treeData.value);
};

// 获取当前选中的参数ID列表
const getCheckedParams = () => {
  const checkedParams = [];

  const collectCheckedParams = (nodes) => {
    if (!nodes || !Array.isArray(nodes)) return;

    nodes.forEach((node) => {
      if (node.type === "param" && node.checked) {
        checkedParams.push(node.id);
      }
      if (node.children && Array.isArray(node.children)) {
        collectCheckedParams(node.children);
      }
    });
  };

  collectCheckedParams(treeData.value);
  return checkedParams;
};

// 查找第一个监测点
const findFirstPoint = () => {
  const findInTree = (nodes) => {
    if (!nodes || !Array.isArray(nodes)) return null;

    for (const node of nodes) {
      if (!node) continue;

      if (node.children && Array.isArray(node.children)) {
        const result = findInTree(node.children);
        if (result) return result;
      }
      if (node.type === "point") {
        return node;
      }
    }
    return null;
  };
  return findInTree(treeData.value);
};

// 查找第一个参数节点
const findFirstParameter = () => {
  const findInTree = (nodes) => {
    if (!nodes || !Array.isArray(nodes)) return null;

    for (const node of nodes) {
      if (!node) continue;

      if (node.children && Array.isArray(node.children)) {
        const result = findInTree(node.children);
        if (result) return result;
      }
      if (node.type === "param") {
        return node;
      }
    }
    return null;
  };
  return findInTree(treeData.value);
};

// 初始化树选择
const initTreeSelection = () => {
  // 查找第一个监测点
  const firstPoint = findFirstPoint();
  if (firstPoint) {
    // 设置第一个监测点的所有参数为选中状态
    setPointParamsChecked(firstPoint.pointId, true);

    // 更新选中参数列表和当前监测点
    selectedParams.value = getPointParamIds(firstPoint.pointId);
    currentMonitor.value = firstPoint.pointId;
    currentpPointCode.value = firstPoint.pointCode;

    // 设置当前选中节点
    const firstParam = findFirstParameter();
    if (firstParam) {
      currentNodeKey.value = firstParam.id;

      nextTick(() => {
        if (treeRef.value) {
          treeRef.value.setCurrentKey(firstParam.id);
        }
      });
    }

    console.log(
      "初始化选择 - 监测点:",
      firstPoint.pointId,
      "监测点编号:",
      firstPoint.pointCode,
      "参数:",
      selectedParams.value
    );

    // 更新图表
    updateChart();
  }
};

// 处理复选框变化
const handleCheckboxChange = (paramData, event) => {
  // 阻止事件冒泡，避免触发节点点击事件
  if (event) {
    event.stopPropagation();
  }

  console.log(
    "复选框变化:",
    paramData.label,
    "checked:",
    paramData.checked,
    "监测点:",
    paramData.pointId
  );

  // 如果勾选了其他监测点的参数
  if (paramData.checked && paramData.pointId !== currentMonitor.value) {
    console.log(`切换到新监测点: ${paramData.pointId}`);

    // 清空其他监测点的选择，保留当前点击的监测点
    clearOtherMonitorParams(paramData.pointId);

    // 更新当前监测点
    currentMonitor.value = paramData.pointId;
    currentpPointCode.value = paramData.pointCode;

    // 确保当前参数被选中
    paramData.checked = true;
  }
  // 如果是当前监测点的参数变化，保持当前监测点的其他选择
  else if (paramData.pointId === currentMonitor.value) {
    console.log(`当前监测点 ${currentMonitor.value} 的参数变化`);
    // 不需要额外处理，保持当前监测点的其他参数选择状态
  }

  // 更新选中参数列表
  selectedParams.value = getCheckedParams();
  console.log("当前选中参数:", selectedParams.value);

  // 更新图表
  updateChart();
};

// 处理节点点击事件
const handleNodeClick = (nodeData, node, treeNode) => {
  if (!nodeData) return;

  console.log(
    "点击节点:",
    nodeData.label,
    "类型:",
    nodeData.type,
    "ID:",
    nodeData.id
  );

  currentNodeKey.value = nodeData.id;

  // 如果点击的是监测点
  if (nodeData.type === "point") {
    console.log(
      `点击监测点: ${nodeData.pointId}, 当前监测点: ${currentMonitor.value}`
    );

    // 如果点击的是不同的监测点
    if (nodeData.pointId !== currentMonitor.value) {
      console.log(`切换到新监测点: ${nodeData.pointId}`);

      // 清空其他监测点的选择
      clearOtherMonitorParams(nodeData.pointId);

      // 选中该监测点的所有参数
      setPointParamsChecked(nodeData.pointId, true);

      // 更新选中参数和当前监测点
      selectedParams.value = getPointParamIds(nodeData.pointId);
      currentMonitor.value = nodeData.pointId;
      currentpPointCode.value = nodeData.pointCode;

      console.log("点击监测点后选中参数:", selectedParams.value);
    }
    // 如果点击的是当前监测点，保持原状
    else {
      console.log("点击当前监测点，保持选择状态");
    }

    // 查询数据并更新图表
    handleQuery();
  }
  // 如果点击的是参数，不处理（由复选框处理）
  else if (nodeData.type === "param") {
    console.log(`点击参数: ${nodeData.label}, 由复选框处理`);
    // 这里不处理，由复选框的change事件处理
    return;
  }
};

// 查询数据
const handleQuery = async () => {
  console.log("查询数据");
  const loading = ElLoading.service({
    lock: true,
    text: "查询数据中...",
    background: "rgba(0, 0, 0, 0.7)",
  });

  try {
    // 如果没有选中监测点，使用默认值
    if (!currentpPointCode.value) {
      const firstPoint = findFirstPoint();
      if (firstPoint) {
        currentpPointCode.value = firstPoint.pointCode;
      }
    }

    // 检查时间范围
    if (!timeRange.value || timeRange.value.length !== 2) {
      ElMessage.warning("请选择时间范围");
      return;
    }

    const [startTime, endTime] = timeRange.value;

    console.log("查询参数:", {
      monitoringPointCode: currentpPointCode.value,
      startTime,
      endTime,
    });

    // 调用接口获取数据
    let apiData = [];
    try {
      const res = await monitorApi.getTrendCurve({
        monitoringPointCode: currentpPointCode.value,
        startTime: startTime,
        endTime: endTime,
      });
      apiData = res || [];
      console.log("接口返回数据:", apiData);
    } catch (error) {
      console.error("调用接口失败:", error);
      // 如果接口调用失败，使用模拟数据
      apiData = generateMockData(startTime, endTime);
      console.log("使用模拟数据:", apiData);
    }

    // 如果接口返回空数据，使用模拟数据
    if (!apiData || apiData.length === 0) {
      apiData = generateMockData(startTime, endTime);
      console.log("接口返回空数据，使用模拟数据:", apiData);
    }

    // 处理数据格式
    currentChartData.value = processChartData(apiData);
    console.log("处理后的图表数据:", currentChartData.value);

    // 更新图表
    updateChart();
  } catch (error) {
    console.error("查询数据失败:", error);
    ElMessage.error("查询数据失败");
  } finally {
    loading.close();
  }
};

// 生成模拟数据
const generateMockData = (startTime, endTime) => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const timeInterval = 10800000; // 3小时间隔
  const data = [];

  for (let time = start; time <= end; time += timeInterval) {
    const dataPoint = {
      id: data.length + 1,
      monitoringPointCode: currentpPointCode.value,
      monitoringPointName: "模拟监测点",
      temperature: Math.floor(Math.random() * 30) + 10, // 10-40度
      humidity: Math.floor(Math.random() * 50) + 30, // 30-80%
      overIce: Math.floor(Math.random() * 100) + 10, // 10-110mm
      underIce: Math.floor(Math.random() * 100) + 5, // 5-105mm
      createTime: new Date(time)
        .toISOString()
        .replace("T", " ")
        .substring(0, 19),
      orderNum: data.length,
    };
    data.push(dataPoint);
  }

  return data;
};

// 处理图表数据格式
const processChartData = (apiData) => {
  if (!apiData || !Array.isArray(apiData)) return [];

  return apiData.map((item) => {
    const time = new Date(item.createTime);
    const timeStr = time.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      time: timeStr,
      temperature: item.temperature,
      humidity: item.humidity,
      overIce: item.overIce,
      underIce: item.underIce,
      // 为每个参数创建对应的键，方便后续处理
      [`param-${currentMonitor.value}-temp`]: item.temperature,
      [`param-${currentMonitor.value}-humi`]: item.humidity,
      [`param-${currentMonitor.value}-ice1`]: item.overIce,
      [`param-${currentMonitor.value}-ice2`]: item.underIce,
    };
  });
};

// 初始化图表
const initChart = () => {
  const chartDom = document.getElementById("history-chart");
  if (!chartDom) {
    console.error("图表容器未找到");
    return false;
  }

  try {
    chartInstance = echarts.init(chartDom);
    chartInitialized.value = true;
    console.log("图表初始化成功");
    return true;
  } catch (error) {
    console.error("图表初始化失败:", error);
    return false;
  }
};

// 更新图表数据
const updateChart = () => {
  if (!chartInstance || !chartInitialized.value) {
    console.log("图表实例未初始化，跳过更新");
    return;
  }

  if (
    !currentChartData.value ||
    !Array.isArray(currentChartData.value) ||
    currentChartData.value.length === 0
  ) {
    console.error("图表数据为空");
    const option = getEmptyChartOption();
    chartInstance.setOption(option, true);
    return;
  }

  console.log("更新图表，选中参数:", selectedParams.value);
  console.log("当前监测点:", currentMonitor.value, currentpPointCode.value);

  const series = [];
  const colors = [
    "#FF6B6B", // 温度 - 亮红色，在深蓝背景下最醒目
    "#4ECDC4", // 湿度 - 青色/绿松色，高对比度
    "#FFE66D", // 上覆冰 - 亮黄色，警告色
    "#6BFF97", // 下覆冰 - 亮绿色，高可见性
  ];

  // 如果没有选中任何参数，显示空图表
  if (!selectedParams.value || selectedParams.value.length === 0) {
    console.log("没有选中任何参数，显示空图表");
    const option = getEmptyChartOption();
    chartInstance.setOption(option, true);
    return;
  }

  selectedParams.value.forEach((paramId, index) => {
    if (!paramId || !paramId.startsWith("param-")) {
      console.log("跳过非参数节点:", paramId);
      return;
    }

    const parts = paramId.split("-");
    if (parts.length < 3) {
      console.log("参数ID格式错误:", paramId);
      return;
    }

    const pointId = parts[1];
    const paramType = parts[2];

    // 查找监测点信息
    let pointInfo = null;
    let paramName = "";
    let dataKey = "";

    for (const points of Object.values(pointDataMap.value)) {
      if (points && Array.isArray(points)) {
        pointInfo = points.find(
          (p) => p && p.id && p.id.toString() === pointId
        );
        if (pointInfo) break;
      }
    }

    if (!pointInfo) {
      console.log("未找到监测点信息，pointId:", pointId);
      return;
    }

    switch (paramType) {
      case "temp":
        paramName = "温度";
        dataKey = "temperature";
        break;
      case "humi":
        paramName = "湿度";
        dataKey = "humidity";
        break;
      case "ice1":
        paramName = "上覆冰";
        dataKey = "overIce";
        break;
      case "ice2":
        paramName = "下覆冰";
        dataKey = "underIce";
        break;
      default:
        console.log("未知参数类型:", paramType);
        return;
    }

    const seriesName = `${pointInfo.name}-${paramName}`;

    // 提取该参数的数据
    const seriesData = currentChartData.value.map((item) => {
      const value = item[dataKey];
      return value !== undefined ? value : null;
    });

    console.log(`生成系列 ${seriesName}, 数据长度:`, seriesData.length);

    series.push({
      name: seriesName,
      type: "line",
      data: seriesData,
      smooth: true,
      symbol: "circle",
      symbolSize: 8,
      lineStyle: { width: 4 },
      itemStyle: { color: colors[index % colors.length] },
    });
  });

  if (series.length === 0) {
    console.log("没有生成任何系列数据，显示空图表");
    const option = getEmptyChartOption();
    chartInstance.setOption(option, true);
    return;
  }

  const option = {
    backgroundColor: "transparent",
    title: {
      text: `监测图 - ${getMonitorFullPath()}`,
      textStyle: { color: "#fff", fontSize: 16 },
      left: "center",
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      borderColor: "#09a9ff",
      borderWidth: 1,
      textStyle: { color: "#fff" },
      formatter: function (params) {
        let result = `<div style="font-size: 14px; margin-bottom: 5px;">${params[0].axisValue}</div>`;
        params.forEach((param) => {
          const value = param.value !== null ? param.value : "N/A";
          result += `<div>${param.marker} <span style="color: #fff;">${
            param.seriesName
          }:</span> <span style="color: #09ffff; font-weight: bold;">${value}${getUnit(
            param.seriesName
          )}</span></div>`;
        });
        return result;
      },
    },
    legend: {
      data: series.map((s) => s.name),
      textStyle: { color: "#fff" },
      right: 10,
      top: 10,
      itemWidth: 25,
      itemHeight: 14,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: currentChartData.value.map((item) => item.time),
      axisLine: { lineStyle: { color: "#ccc" } },
      axisLabel: { color: "#fff", fontSize: 16 },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#ccc" } },
      axisLabel: { color: "#fff", fontSize: 16 },
      splitLine: {
        lineStyle: {
          color: "rgba(255, 255, 255, 0.3)",
          type: "dashed",
        },
      },
    },
    series: series,
  };

  console.log("设置图表选项，系列数量:", series.length);
  chartInstance.setOption(option, true);
};

// 获取空图表选项
const getEmptyChartOption = () => {
  return {
    backgroundColor: "transparent",
    title: {
      text: "暂无数据",
      textStyle: { color: "#fff" },
      left: "center",
      top: "center",
    },
    xAxis: {
      type: "category",
      data: [],
      axisLine: { lineStyle: { color: "#ccc" } },
      axisLabel: { color: "#fff" },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#ccc" } },
      axisLabel: { color: "#fff" },
      splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.5)" ,type: 'dashed'} },
    },
    series: [],
  };
};

// 获取单位
const getUnit = (seriesName) => {
  if (seriesName.includes("温度")) return "℃";
  if (seriesName.includes("湿度")) return "%";
  if (seriesName.includes("覆冰")) return "mm";
  return "";
};

// 获取监测点层级信息
const getMonitorHierarchyInfo = () => {
  if (!currentpPointCode.value) {
    return null;
  }

  const result = {
    monitoringPoint: null,
    powerLine: null,
    powerSection: null,
  };

  const findHierarchy = (nodes, parent = null, grandParent = null) => {
    if (!nodes || !Array.isArray(nodes)) return false;

    for (const node of nodes) {
      if (!node) continue;

      // 如果是监测点节点
      if (node.type === "point" && node.pointCode === currentpPointCode.value) {
        result.monitoringPoint = node;
        result.powerLine = parent;
        result.powerSection = grandParent;
        return true;
      }

      // 如果有子节点，递归查找
      if (node.children && Array.isArray(node.children)) {
        if (findHierarchy(node.children, node, parent)) {
          return true;
        }
      }
    }
    return false;
  };

  findHierarchy(treeData.value);
  return result;
};

// 获取监测点完整路径
const getMonitorFullPath = () => {
  const hierarchyInfo = getMonitorHierarchyInfo();

  if (!hierarchyInfo) {
    return "未选择监测点";
  }

  const path = [];
  if (hierarchyInfo.powerSection) {
    path.push(hierarchyInfo.powerSection.label);
  }
  if (hierarchyInfo.powerLine) {
    path.push(hierarchyInfo.powerLine.label);
  }
  if (hierarchyInfo.monitoringPoint) {
    path.push(hierarchyInfo.monitoringPoint.label);
  }

  return path.join("-");
};

// 导出图片
const handleExportImage = () => {
  if (chartInstance) {
    const imageUrl = chartInstance.getDataURL({
      type: "png",
      pixelRatio: 2,
    });
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = getExportFileName(".png");
    link.click();
  }
};

// 获取导出文件名
const getExportFileName = (extension = ".xlsx") => {
  if (!timeRange.value || timeRange.value.length !== 2) {
    return `监测数据${extension}`;
  }

  const [startTime, endTime] = timeRange.value;
  const start = startTime.replace(/[: ]/g, "-").substring(0, 16);
  const end = endTime.replace(/[: ]/g, "-").substring(0, 16);
  const path = getMonitorFullPath().replace(/[<>:"/\\|?*]/g, "-");

  return `${start}_${end}(${path})${extension}`;
};



// 获取所有可导出的列配置
const getAllExportColumns = async () => {
  try {
    const res = await monitorApi.getAllExportColumns();
    console.log("导出列配置:", res);
    return res || [];
  } catch (error) {
    console.error("获取导出列配置失败:", error);
    // 返回默认的列配置
    return [
      {
        "columnName": "序号",
        "propertyName": "orderNum"
      },
      {
        "columnName": "监测点编号",
        "propertyName": "monitoringPointCode"
      },
      {
        "columnName": "数据采集时间",
        "propertyName": "createTime"
      },
      {
        "columnName": "温度 (℃)",
        "propertyName": "temperature"
      },
      {
        "columnName": "湿度 (%)",
        "propertyName": "humidity"
      },
      {
        "columnName": "上覆冰厚度 (mm)",
        "propertyName": "overIce"
      },
      {
        "columnName": "下覆冰厚度 (mm)",
        "propertyName": "underIce"
      }
    ];
  }
};

// 获取选中的列
const getSelectedColumns = async () => {
  try {
    // 获取所有可导出的列配置
    const allColumns = await getAllExportColumns();
    
    // 前三个是默认列：序号、监测点编号、数据采集时间
    const defaultColumns = allColumns.slice(0, 3).map(col => col.columnName);
    
    // 根据选中的参数映射到对应的列名
    const dynamicColumns = [];
    
    if (selectedParams.value.some((param) => param.includes("temp"))) {
      const tempColumn = allColumns.find(col => col.propertyName === "temperature");
      if (tempColumn) dynamicColumns.push(tempColumn.columnName);
    }
    if (selectedParams.value.some((param) => param.includes("humi"))) {
      const humiColumn = allColumns.find(col => col.propertyName === "humidity");
      if (humiColumn) dynamicColumns.push(humiColumn.columnName);
    }
    if (selectedParams.value.some((param) => param.includes("ice1"))) {
      const ice1Column = allColumns.find(col => col.propertyName === "overIce");
      if (ice1Column) dynamicColumns.push(ice1Column.columnName);
    }
    if (selectedParams.value.some((param) => param.includes("ice2"))) {
      const ice2Column = allColumns.find(col => col.propertyName === "underIce");
      if (ice2Column) dynamicColumns.push(ice2Column.columnName);
    }
    
    const columns = [...defaultColumns, ...dynamicColumns];
    console.log("选中的列:", columns);
    return columns;
  } catch (error) {
    console.error("获取选中列失败:", error);
    // 出错时返回默认列
    return ["orderNum", "monitoringPointCode", "createTime"];
  }
};
// 导出Excel
const handleExportExcel = async () => {
  console.log("导出Excel");
  exportLoading.value = true;
  const loading = ElLoading.service({
    lock: true,
    text: "正在导出Excel文件...",
    background: "rgba(0, 0, 0, 0.7)",
  });

  try {
    // 检查时间范围
    if (!timeRange.value || timeRange.value.length !== 2) {
      ElMessage.warning("请选择时间范围");
      return;
    }

    const [startTime, endTime] = timeRange.value;

    // 如果没有选中监测点，使用默认值
    if (!currentpPointCode.value) {
      const firstPoint = findFirstPoint();
      if (firstPoint) {
        currentpPointCode.value = firstPoint.pointCode;
      } else {
        ElMessage.warning("请先选择监测点");
        return;
      }
    }

    // 获取选中的列
    const columns = await getSelectedColumns();
    
    // 检查是否至少选择了一个动态参数（除了默认的三个列之外）
    const hasDynamicColumns = columns.length > 3;
    if (!hasDynamicColumns) {
      ElMessage.warning("请至少选择一个参数（温度、湿度、上覆冰或下覆冰）");
      return;
    }

    console.log("导出Excel参数:", {
      monitoringPointCode: currentpPointCode.value,
      startTime,
      endTime,
      columns,
    });

    // 调用导出接口
    const res = await monitorApi.exportCurve({
      monitoringPointCode: currentpPointCode.value,
      startTime: startTime,
      endTime: endTime,
      columns: columns,
    });

    // 处理导出结果
    if (res) {
      handleExcelFileResponse(res);
      ElMessage.success("导出成功");
    } else {
      throw new Error(res?.message || "导出失败");
    }
  } catch (error) {
    console.error("导出Excel失败:", error);
    ElMessage.error(error.message || "导出Excel失败");

    // 如果接口调用失败，使用模拟导出
    try {
      await handleMockExportExcel();
    } catch (mockError) {
      console.error("模拟导出也失败:", mockError);
      ElMessage.error("导出失败，请重试");
    }
  } finally {
    exportLoading.value = false;
    loading.close();
  }
};

// 处理导出数据格式
const processExportData = (apiData) => {
  if (!apiData || !Array.isArray(apiData)) return [];

  return apiData.map((item, index) => {
    const rowData = {
      "序号": index + 1,
      "监测点编号": item.monitoringPointCode || currentpPointCode.value,
      "数据采集时间": formatExportTime(item.createTime),
      "监测点名称": item.monitoringPointName || "未知监测点"
    };

    // 添加选中的动态列
    if (selectedParams.value.some(param => param.includes("temp")) && item.temperature !== undefined) {
      rowData["温度 (℃)"] = item.temperature;
    }
    if (selectedParams.value.some(param => param.includes("humi")) && item.humidity !== undefined) {
      rowData["湿度 (%)"] = item.humidity;
    }
    if (selectedParams.value.some(param => param.includes("ice1")) && item.overIce !== undefined) {
      rowData["上覆冰厚度 (mm)"] = item.overIce;
    }
    if (selectedParams.value.some(param => param.includes("ice2")) && item.underIce !== undefined) {
      rowData["下覆冰厚度 (mm)"] = item.underIce;
    }

    return rowData;
  });
};

// 处理Excel文件响应
const handleExcelFileResponse = (response) => {
  // 假设接口返回的是Blob数据
  if (response instanceof Blob) {
    const url = window.URL.createObjectURL(response);
    const link = document.createElement("a");
    link.href = url;
    link.download = getExportFileName(".xlsx");
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } else {
    // 如果是其他格式，尝试解析
    console.log("处理文件响应:", response);
    ElMessage.warning("暂不支持的文件格式，尝试使用模拟导出");
    handleMockExportExcel();
  }
};

// 模拟导出Excel（接口失败时的备用方案）
const handleMockExportExcel = async () => {
  console.log("使用模拟导出Excel");
  try {
    const XLSX = await import("xlsx");

    // 重新查询数据用于导出
    const [startTime, endTime] = timeRange.value;
    let exportData = [];

    try {
      // 尝试从接口获取数据
      const res = await monitorApi.getTrendCurve({
        monitoringPointCode: currentpPointCode.value,
        startTime: startTime,
        endTime: endTime,
      });
      exportData = res || [];
    } catch (error) {
      console.error("获取导出数据失败，使用模拟数据:", error);
      exportData = generateMockData(startTime, endTime);
    }

    if (exportData.length === 0) {
      exportData = generateMockData(startTime, endTime);
    }

    // 处理导出数据格式
    const processedData = processExportData(exportData);

    // 创建Excel工作簿
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "监测数据");

    // 设置列宽
    const colWidths = [
      { wch: 20 }, // 时间列
      { wch: 15 }, // 监测点编号
      { wch: 15 }, // 监测点名称
      { wch: 12 }, // 温度
      { wch: 12 }, // 湿度
      { wch: 12 }, // 上覆冰
      { wch: 12 }, // 下覆冰
    ];
    worksheet["!cols"] = colWidths;

    // 生成Excel文件并下载
    XLSX.writeFile(workbook, getExportFileName(".xlsx"));
    ElMessage.success("模拟导出成功");
  } catch (error) {
    console.error("模拟导出失败:", error);
    throw error;
  }
};


// 格式化导出时间
const formatExportTime = (timeStr) => {
  if (!timeStr) return "";
  try {
    const date = new Date(timeStr);
    return date
      .toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(/\//g, "-");
  } catch (error) {
    return timeStr;
  }
};

// 响应窗口大小变化
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};

onMounted(() => {
  console.log("组件挂载开始");
  // 先初始化图表
  const initSuccess = initChart();
  if (!initSuccess) {
    console.error("图表初始化失败");
    return;
  }

  // 然后加载数据
  getDepartmentData().then(() => {
    console.log("数据加载完成，初始化树选择");
    initTreeSelection();
  });

  window.addEventListener("resize", handleResize);
});

// 监听选中参数变化，自动更新图表
watch(
  selectedParams,
  (newParams) => {
    console.log("选中参数变化，更新图表:", newParams);
    updateChart();
  },
  { deep: true, immediate: false }
);
</script>

<template>
  <div class="page-history">
    <div class="layout-container">
      <!-- 左侧树形菜单 -->
      <div class="left-panel">
         <el-scrollbar class="tree-container">
          <el-tree
            ref="treeRef"
            :data="treeData"
            node-key="id"
            default-expand-all
            highlight-current
            :props="{
              children: 'children',
              label: 'label',
            }"
            :expand-on-click-node="false"
            :current-node-key="currentNodeKey"
            @node-click="handleNodeClick"
            class="custom-tree"
          >
            <template #default="{ node, data }">
              <div class="custom-tree-node">
                <span v-if="data.type !== 'param'" class="node-label">{{
                  node.label
                }}</span>
                <el-checkbox
                  v-else
                  v-model="data.checked"
                  :label="node.label"
                  size="large"
                  @change="(checked) => handleCheckboxChange(data, $event)"
                />
              </div>
            </template>
          </el-tree>
        </el-scrollbar>
      </div>

      <!-- 右侧内容区域 -->
      <div class="right-panel">
        <!-- 顶部操作栏 -->
        <div class="top-bar">
          <div class="time-filter">
            <span class="filter-label">时间范围：</span>
            <el-date-picker
              v-model="timeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              class="time-picker"
            />
            <el-button type="primary" @click="handleQuery" class="query-btn">
              <i class="el-icon-search"></i>
              查询
            </el-button>
          </div>

          <div class="export-buttons">
            <el-button @click="handleExportImage" class="export-btn">
              <IconPicture />
              导出图片
            </el-button>
            <el-button
              @click="handleExportExcel"
              class="export-btn"
              :loading="exportLoading"
              :class="{ 'is-loading': exportLoading }"
            >
              <IconExcel />
              {{ exportLoading ? "导出中..." : "导出Excel" }}
            </el-button>
          </div>
        </div>

        <!-- 图表区域 -->
        <div class="chart-container">
          <div id="history-chart" class="chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-history {
  width: 100%;
  height: calc(100vh - 66px);
  background-image: url("@/assets/image/history-bg.svg");
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  box-sizing: border-box;
  overflow: hidden;
}

.layout-container {
  display: flex;
  height: 100%;
  gap: 20px;
}

.left-panel {
  width: 14%;
  min-width: 260px;
  background-image: url("@/assets/image/aside-bg.svg");
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;

  .tree-container {
    height: 100%;
    padding: 28px 24px;
  }
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.top-bar {
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .time-filter {
    display: flex;
    align-items: center;
    gap: 10px;

    .filter-label {
      color: #fff;
      font-size: 14px;
    }
  }

  .export-buttons {
    display: flex;
    gap: 10px;
  }
}

.chart-container {
  flex: 1;
  background: rgba(44, 121, 205, 0.1);
  box-sizing: border-box;
  border: 1px solid #09a9ff;
  box-shadow: inset 0px 0px 40px 0px #09a9ff;
  padding: 20px;
  min-height: 400px;

  .chart {
    width: 100%;
    height: 100%;
    min-height: 400px;
  }
}

// 自定义树样式
:deep(.custom-tree) {
  background: transparent;
  width: 100%;
  height: 100%;

  .el-tree-node {
    &:focus > .el-tree-node__content {
      background-color: transparent;
    }
    .el-tree-node__content {
      height: 44px;
      color: #fff;
      .el-tree-node__label {
        font-size: 16px;
        color: #fff;
      }
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    &.is-current {
      .el-tree-node__content {
        background: rgba(84, 112, 198, 0.3);
      }
    }
  }
}

// 自定义节点样式
:deep(.custom-tree-node) {
  width: 100%;
  display: flex;
  align-items: center;
  .node-label {
    font-size: 16px;
    color: #ffffff;
  }
  .el-checkbox {
    margin-right: 8px;
    .el-checkbox__label {
      font-size: 16px;
      color: #ffffff;
    }
  }
}

// 时间选择器样式
:deep(.time-picker) {
  width: 360px;
  color: #fff;
  background: #165cae;
  border: 1px solid #19c5ff;
  box-shadow: inset 0px 4px 10px 0px #33a9ff;
  &:hover {
    box-shadow: inset 0px 4px 10px 0px #33a9ff;
  }
  .el-range-input,
  .el-range-separator {
    color: #ffffff;
  }
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
}

// 按钮样式
:deep(.query-btn) {
  background: #09a9ff;
  border: 1px solid #19c5ff;
  box-shadow: inset 0px 4px 10px 0px #33a9ff;
  border: none;

  &:hover {
    background: #09a9ff;
  }
}

:deep(.export-btn) {
  height: 42px;
  background: linear-gradient(180deg, #00aeff 0%, #95d6ff 100%);
  border: 1px solid #0f7cb9;
  color: #00569c;
  svg {
    margin-right: 8px;
  }
  &:hover {
    background: linear-gradient(180deg, #00aeff 0%, #95d6ff 100%);
    border: 1px solid #3793c9;
    color: #00569c;
  }

  &.is-loading {
    opacity: 0.7;
    pointer-events: none;
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .layout-container {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
    height: 300px;
  }

  .top-bar {
    flex-direction: column;
    height: auto;
    gap: 15px;
    .time-filter {
      justify-content: space-between;
      width: 100%;
    }

    .export-buttons {
      justify-content: flex-end;
      width: 100%;
    }
  }
}
</style>
