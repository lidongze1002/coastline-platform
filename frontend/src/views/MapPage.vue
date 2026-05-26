<template>
  <div style="display: flex; width: 100%; height: 100%; overflow: hidden">
    <div ref="mapEl" class="map-container" :style="{ flex: 1 }"></div>

    <!-- 拖拽调整宽度的分隔条 -->
    <div 
      class="resize-handle" 
      @mousedown="startResize"
      :class="{ 'is-resizing': isResizing }"
    >
      <div class="resize-line"></div>
    </div>

    <div class="panel" :style="{ width: panelWidth + 'px', flexShrink: 0 }">
      <div class="panel-header">
        <div style="display: flex; flex-direction: column; gap: 8px">
          <div style="display: flex; align-items: center; justify-content: space-between">
            <div style="font-weight: 800">海岸线变化</div>
            <el-button size="small" :loading="loading" @click="loadDatasets">刷新</el-button>
          </div>
          <el-card shadow="never" style="background: rgba(0, 0, 0, 0.03)">
            <div style="font-weight: 700; margin-bottom: 4px">{{ greetingText }}，{{ usernameText }}</div>
            <div style="font-size: 12px; opacity: 0.8">日期时间：{{ nowText }}</div>
            <div style="font-size: 12px; opacity: 0.8">位置：{{ locationText }}</div>
            <div style="font-size: 12px; opacity: 0.8">天气：{{ weatherText }}{{ temperatureText }}</div>
            <div v-if="clothingRecommendation" style="font-size: 12px; margin-top: 4px; color: #409eff; font-weight: 500">{{ clothingRecommendation }}</div>
          </el-card>
        </div>
      </div>

      <div class="panel-body">
        <el-tabs v-model="activeTab" class="demo-tabs">
<el-tab-pane label="数据集" name="datasets">
            <!-- B站风格筛选 -->
            <div style="margin-bottom: 12px">
              <!-- 区域筛选 -->
              <div style="margin-bottom: 10px">
                <div style="font-size: 12px; opacity: 0.7; margin-bottom: 6px">区域</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px">
                  <span 
                    :class="['filter-tag', { active: !filterRegion }]" 
                    @click="filterRegion = ''"
                  >全部</span>
                  <span 
                    v-for="r in regionOptions" 
                    :key="r" 
                    :class="['filter-tag', { active: filterRegion === r }]"
                    @click="filterRegion = r"
                  >{{ r }}</span>
                </div>
              </div>
              
              <!-- 传感器筛选 -->
              <div style="margin-bottom: 10px">
                <div style="font-size: 12px; opacity: 0.7; margin-bottom: 6px">传感器</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px">
                  <span 
                    :class="['filter-tag', { active: !filterSensor }]" 
                    @click="filterSensor = null"
                  >全部</span>
                  <span 
                    :class="['filter-tag', { active: filterSensor === 'sentinel2' }]"
                    @click="filterSensor = 'sentinel2'"
                  >Sentinel-2</span>
                  <span 
                    :class="['filter-tag', { active: filterSensor === 'landsat8' }]"
                    @click="filterSensor = 'landsat8'"
                  >Landsat-8</span>
                  <span 
                    :class="['filter-tag', { active: filterSensor === 'landsat9' }]"
                    @click="filterSensor = 'landsat9'"
                  >Landsat-9</span>
                  <span 
                    :class="['filter-tag', { active: filterSensor === 'mixed' }]"
                    @click="filterSensor = 'mixed'"
                  >Mixed</span>
                </div>
              </div>
              
              <!-- 类型筛选 -->
              <div style="margin-bottom: 10px">
                <div style="font-size: 12px; opacity: 0.7; margin-bottom: 6px">数据类型</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px">
                  <span 
                    :class="['filter-tag', { active: !filterDataType }]" 
                    @click="filterDataType = null"
                  >全部</span>
                  <span 
                    :class="['filter-tag', { active: filterDataType === 'shoreline' }]"
                    @click="filterDataType = 'shoreline'"
                  >海岸线</span>
                  <span 
                    :class="['filter-tag', { active: filterDataType === 'reference' }]"
                    @click="filterDataType = 'reference'"
                  >参考线</span>
                </div>
              </div>
              
              <!-- 年份筛选 -->
              <div style="margin-bottom: 10px">
                <div style="font-size: 12px; opacity: 0.7; margin-bottom: 6px">年份范围</div>
                <div style="display: flex; align-items: center; gap: 8px">
                  <el-date-picker
                    v-model="filterStartDate"
                    type="year"
                    placeholder="起始"
                    size="small"
                    style="width: 100px"
                    format="YYYY"
                    value-format="YYYY"
                  />
                  <span style="opacity: 0.5">至</span>
                  <el-date-picker
                    v-model="filterEndDate"
                    type="year"
                    placeholder="终止"
                    size="small"
                    style="width: 100px"
                    format="YYYY"
                    value-format="YYYY"
                  />
                </div>
              </div>
            </div>

            <div style="position: relative; z-index: 1; margin-top: 10px; overflow: visible">
              <el-table
                :data="datasets"
                size="small"
                :fit="false"
                style="width: 100%"
                height="360"
                @selection-change="onSelectionChange"
                @row-click="onRowClick"
              >
                <el-table-column type="selection" width="40" />
                <el-table-column prop="regionName" label="区域" width="90" />
                <el-table-column label="年份" width="80">
                  <template #default="{ row }">{{ new Date(row.date).getFullYear() }}</template>
                </el-table-column>
                <el-table-column prop="sensor" label="数据源" width="80" />
                <el-table-column label="类型" width="80">
                  <template #default="{ row }">{{ row.dataType === 'reference' ? '参考线' : '海岸线' }}</template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="{ row }">
                    <el-button size="small" type="primary" link @click.stop="handleDownload(row)">
                      下载
                    </el-button>
                    <el-button size="small" type="danger" link @click.stop="handleDelete(row)">
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div style="margin-top: 8px; font-size: 12px; opacity: 0.78">
              当前共 {{ datasets.length }} 个数据集可选择，支持区域、传感器、类型筛选。参考线（母集）排在前面，海岸线（子集）排在后面。
            </div>

            <el-divider />
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px">
              <div style="font-weight: 700">当前图层</div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <el-button size="small" type="primary" :disabled="selectedDatasets.length === 0" @click="loadSelectedDatasets">
                  加载选中 ({{ selectedDatasets.length }})
                </el-button>
                <el-button size="small" :disabled="selectedDatasets.length === 0" @click="goToExportMap">
                  自定义出图 ({{ selectedDatasets.length }})
                </el-button>
                <el-button size="small" type="success" :disabled="selectedDatasets.length === 0" @click="downloadSelectedDatasets">
                  批量下载 ({{ selectedDatasets.length }})
                </el-button>
                <el-button size="small" @click="clearLayer">清空</el-button>
              </div>
            </div>
            <!-- 多选状态显示 -->
            <div v-if="selectedDatasets.length > 0" style="margin-top: 8px">
              <div style="margin-bottom: 8px">
                <span v-for="(ds, idx) in selectedDatasets" :key="ds.id" :style="{ color: getDatasetColorStr(idx), fontWeight: 'bold' }">
                  {{ getYearFromDate(ds.date) }}年
                </span>
              </div>
            </div>
            <!-- 单选详情显示 -->
            <div v-if="selected && selectedDatasets.length === 0" style="margin-top: 8px; line-height: 1.6">
              <div><b>名称：</b>{{ selected.name }}</div>
              <div><b>区域：</b>{{ selected.regionName }}</div>
              <div><b>传感器：</b>{{ sensorLabel(selected.sensor) }}</div>
              <div><b>类型：</b>{{ selected.dataType === "reference" ? "参考线" : "海岸线" }}</div>
              <div><b>日期：</b>{{ formatDate(selected.date) }}</div>
              <div><b>方法：</b>{{ selected.method }}</div>
              <div v-if="selected.coastlineType"><b>海岸线分类：</b>{{ selected.coastlineType }}</div>
              <div v-if="selected.description" style="margin-top: 8px; max-height: 200px; overflow-y: auto; font-size: 12px; white-space: pre-wrap; background: #f5f5f5; padding: 8px; border-radius: 4px">
                <b>数据详情：</b>
{{ selected.description }}
              </div>
              <div style="margin-top: 8px">
                <el-button size="small" type="primary" @click="downloadOriginalData">
                  <el-icon><Download /></el-icon>下载原始数据
                </el-button>
                <el-button size="small" @click="exportMapWithScale">
                  <el-icon><Camera /></el-icon>导出图片
                </el-button>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="底图" name="basemap">
            <div style="font-weight: 700; margin-bottom: 8px">切换底图</div>
            <el-radio-group v-model="basemapId" @change="applyBasemap">
              <el-radio-button value="osm">OpenStreetMap</el-radio-button>
              <el-radio-button value="gray-vector">Gray</el-radio-button>
              <el-radio-button value="topo-vector">Topo</el-radio-button>
              <el-radio-button value="streets-vector">Streets</el-radio-button>
              <el-radio-button value="satellite">Satellite</el-radio-button>
              <el-radio-button value="oceans">Oceans</el-radio-button>
            </el-radio-group>
          </el-tab-pane>

          <el-tab-pane label="监测数据" name="stations">
            <div style="font-weight: 700; margin-bottom: 8px">监测站点与历史数据（业务面板示例）</div>
            <div style="opacity: 0.8; margin-bottom: 8px">
              点击地图上的站点（点要素）或在下表选择站点，即可联动展示历史曲线与表格。
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px">
              <el-select
                v-model="stationRegion"
                placeholder="选择省份/区域"
                size="small"
                clearable
                style="flex: 1"
                :teleported="false"
                @change="onStationRegionChange"
              >
                <el-option v-for="r in stationRegions" :key="r" :label="r" :value="r" />
              </el-select>
              <el-button size="small" @click="loadStations">刷新</el-button>
            </div>
            <el-table
              :data="filteredStations"
              size="small"
              height="220"
              highlight-current-row
              @current-change="onSelectStation"
            >
              <el-table-column prop="name" label="站点" />
              <el-table-column prop="regionName" label="区域" width="160" />
            </el-table>
            <el-divider />
            <div v-if="!selectedStation" style="opacity: 0.75">未选择站点。</div>
            <template v-else>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px">
                <div style="font-weight: 700">{{ selectedStation.name }}</div>
                <el-button size="small" @click="loadStationObs">刷新</el-button>
              </div>
              <el-card shadow="never" style="margin-bottom: 10px">
                <div style="display: flex; align-items: center; justify-content: space-between">
                  <div style="font-weight: 700">实时监测</div>
                  <div style="font-size: 12px; opacity: 0.75">
                    {{ realtime.at ? fmtTime(realtime.at) : "未获取" }}
                  </div>
                </div>
                <div class="realtime-grid">
                  <div class="metric-card">
                    <div style="font-size: 12px; opacity: 0.75">SST</div>
                    <div style="font-weight: 800; font-size: 16px">{{ realtime.sst ?? "-" }} °C</div>
                  </div>
                  <div class="metric-card">
                    <div style="font-size: 12px; opacity: 0.75">盐度</div>
                    <div style="font-weight: 800; font-size: 16px">{{ realtime.salinity ?? "-" }}</div>
                  </div>
                  <div class="metric-card">
                    <div style="font-size: 12px; opacity: 0.75">浊度</div>
                    <div style="font-weight: 800; font-size: 16px">{{ realtime.turbidity ?? "-" }}</div>
                  </div>
                  <div class="metric-card">
                    <div style="font-size: 12px; opacity: 0.75">叶绿素</div>
                    <div style="font-weight: 800; font-size: 16px">{{ realtime.chlorophyll ?? "-" }} mg/m³</div>
                  </div>
                  <div class="metric-card">
                    <div style="font-size: 12px; opacity: 0.75">溶解氧</div>
                    <div style="font-weight: 800; font-size: 16px">{{ realtime.dissolvedOxygen ?? "-" }} mg/L</div>
                  </div>
                  <div style="display: flex; align-items: flex-end; justify-content: flex-end">
                    <el-button size="small" :loading="realtimeLoading" @click="loadRealtime">立即刷新</el-button>
                  </div>
                </div>
                <div style="margin-top: 6px; font-size: 12px; opacity: 0.7">
                  说明：实时值为后端按当前时间生成的模拟观测（用于展示实时性），并以该站点最新历史记录作为基线。
                </div>
              </el-card>
              <div ref="chartEl" style="height: 220px; width: 100%"></div>
              <div class="station-table-wrap">
                <el-table :data="stationObs" size="small" :fit="false" height="220" style="margin-top: 8px; min-width: 920px">
                  <el-table-column prop="at" label="日期" width="120">
                    <template #default="{ row }">{{ formatDate(row.at) }}</template>
                  </el-table-column>
                  <el-table-column prop="sst" label="SST(°C)" width="100" />
                  <el-table-column prop="salinity" label="盐度" width="90" />
                  <el-table-column prop="turbidity" label="浊度" width="90" />
                  <el-table-column prop="chlorophyll" label="叶绿素" width="100" />
                  <el-table-column prop="dissolvedOxygen" label="溶解氧" width="100" />
                </el-table>
              </div>
            </template>
          </el-tab-pane>

<el-tab-pane label="评论" name="comments">
            <div v-if="!selected" style="opacity: 0.75">先在"数据集"里选择一个数据集，再查看/发表评论。</div>
            <template v-else>
              <!-- 抖音风格评论输入框 -->
              <div class="comment-input-wrapper">
                <el-avatar v-if="auth.user?.avatar" :size="32" :src="auth.user.avatar" />
                <el-avatar v-else :size="32" class="comment-avatar">{{ auth.user?.username?.[0]?.toUpperCase() || 'U' }}</el-avatar>
                <div style="flex: 1">
                  <el-input 
                    v-model="newComment" 
                    :placeholder="replyTo ? `回复 @${replyTo.username}：` : '写下你的评论...'"
                    @keyup.enter="postComment"
                  />
                </div>
                <el-button type="primary" size="small" :disabled="!newComment.trim()" @click="postComment">
                  发送
                </el-button>
              </div>
              <div v-if="replyTo" style="padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 8px; font-size: 12px; display: flex; justify-content: space-between; align-items: center">
                <span>回复 <span style="color: #409eff">@{{ replyTo.username }}</span></span>
                <el-button size="small" text @click="cancelReply">取消</el-button>
              </div>
              
              <!-- 抖音风格评论列表 -->
              <el-skeleton :loading="commentsLoading" animated :rows="6">
                <div v-if="comments.length === 0" style="opacity: 0.75; text-align: center; padding: 20px">暂无评论，快来抢沙发~</div>
                <div v-else class="comment-list">
                  <div v-for="c in comments" :key="c.id" class="comment-item">
                    <el-avatar :size="36" :style="getAvatarStyle(c.username)">{{ c.username?.[0]?.toUpperCase() || 'U' }}</el-avatar>
                    <div class="comment-content">
                      <div class="comment-header">
                        <span class="comment-username">{{ c.username }}</span>
                        <span class="comment-time">{{ fmtTime(c.createdAt) }}</span>
                      </div>
                      <div class="comment-text">{{ c.text }}</div>
                      <div class="comment-actions">
                        <span class="reply-btn" @click="startReply(c)">回复</span>
                        <span v-if="canDeleteComment(c)" class="delete-btn" @click="deleteComment(c.id)">删除</span>
                      </div>
                      <!-- 回复列表 -->
                      <div v-if="c.replies && c.replies.length > 0" class="reply-list">
                        <div v-for="r in c.replies" :key="r.id" class="reply-item">
                          <span class="reply-username">{{ r.username }}</span>
                          <span v-if="r.replyTo" class="reply-to">@{{ r.replyTo }}</span>
                          <span class="reply-text">: {{ r.text }}</span>
                          <div class="reply-actions">
                            <span class="reply-btn" @click="startReply(c, r)">回复</span>
                            <span v-if="canDeleteComment(r)" class="delete-btn" @click="deleteComment(r.id)">删除</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </el-skeleton>
            </template>
          </el-tab-pane>

          <el-tab-pane label="信息检索" name="search">
            <div style="opacity: 0.9; line-height: 1.6; margin-bottom: 8px">
              使用老师给的参考内容（Living Atlas）做公开数据检索示例（只读，不需要密钥）。
            </div>
            <div style="display: flex; gap: 8px">
              <el-input v-model="searchQ" placeholder="如：coastline geojson、marine protected area" />
              <el-button type="primary" :loading="searchLoading" @click="doSearch">搜索</el-button>
            </div>
            <el-divider />
            <el-skeleton :loading="searchLoading" animated :rows="8">
              <div v-if="searchResults.length === 0" style="opacity: 0.75">暂无结果。</div>
              <el-card v-for="r in searchResults" :key="r.id" style="margin-bottom: 10px">
                <div style="font-weight: 700">{{ r.title }}</div>
                <div style="font-size: 12px; opacity: 0.8; margin: 6px 0">
                  {{ r.type }} · {{ r.access }} · {{ r.owner }}
                </div>
                <div v-if="r.snippet" style="font-size: 13px; opacity: 0.9" v-html="r.snippet"></div>
                <div v-if="r.url" style="margin-top: 6px; font-size: 12px">
                  <a :href="r.url" target="_blank" rel="noreferrer">{{ r.url }}</a>
                </div>
              </el-card>
            </el-skeleton>
          </el-tab-pane>

<el-tab-pane label="空间分析" name="analysis">
            <div style="font-weight: 700; margin-bottom: 8px">绘制与空间分析（量算/缓冲/相交筛选）</div>
            <div style="opacity: 0.8; margin-bottom: 10px">
              在地图上绘制几何后，将自动计算长度/面积，并可对当前"海岸线图层"做空间相交筛选。
            </div>

            <div ref="sketchEl" style="width: 100%"></div>

            <el-divider />

            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
              <div style="font-weight: 700">缓冲区</div>
              <el-switch v-model="analysis.bufferEnabled" active-text="启用" />
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px">
              <el-input-number
                v-model="analysis.bufferMeters"
                :min="0"
                :max="500000"
                :step="50"
                controls-position="right"
                size="small"
                style="flex: 1"
              />
              <el-button size="small" :disabled="!analysis.hasGeometry" @click="applyAnalysisOverlay">应用</el-button>
              <el-button size="small" @click="clearAnalysis">清空</el-button>
            </div>
            <div style="font-size: 12px; opacity: 0.75; margin-top: 6px">单位：米（m）。启用缓冲后，将以缓冲几何参与筛选。</div>

            <el-divider />

            <div style="font-weight: 700; margin-bottom: 6px">量算结果</div>
            <div v-if="!analysis.hasGeometry" style="opacity: 0.75">尚未绘制几何。</div>
            <div v-else style="line-height: 1.7">
              <div><b>类型：</b>{{ analysis.geometryType }}</div>
              <div v-if="analysis.lengthMeters != null"><b>长度：</b>{{ fmtMeters(analysis.lengthMeters) }}</div>
              <div v-if="analysis.areaSqm != null"><b>面积：</b>{{ fmtSqm(analysis.areaSqm) }}</div>
            </div>

            <el-divider />

            <div style="display: flex; align-items: center; justify-content: space-between">
              <div style="font-weight: 700">空间筛选（相交）</div>
              <el-button size="small" :disabled="!analysis.hasGeometry || !selected" @click="runSpatialFilter">
                筛选当前海岸线
              </el-button>
            </div>
            <div style="font-size: 12px; opacity: 0.75; margin-top: 6px">
              说明：仅对"当前已加载的海岸线要素"做前端相交判断（无需后端计算）。
            </div>

            <div style="margin-top: 10px">
              <el-table
                :data="analysis.matches"
                size="small"
                style="width: 100%"
                height="240"
                highlight-current-row
                @current-change="onSelectMatch"
              >
                <el-table-column prop="datasetName" label="数据集" min-width="140" />
                <el-table-column prop="sensor" label="来源" width="110" />
                <el-table-column prop="date" label="日期" width="120">
                  <template #default="{ row }">{{ formatDate(row.date) }}</template>
                </el-table-column>
              </el-table>
            </div>
            <div style="margin-top: 6px; font-size: 12px; opacity: 0.75">
              匹配：{{ analysis.matches.length }} 条（黄色高亮）
            </div>
          </el-tab-pane>

          <el-tab-pane label="动画演示" name="animation">
            <div style="font-weight: 700; margin-bottom: 8px">海岸线变化动画</div>
            <div style="opacity: 0.8; margin-bottom: 12px; font-size: 12px">
              选择同一区域多年数据，生成海岸线演变动画。插值填充年份空缺，形成连贯演示。
            </div>

            <!-- 区域筛选 -->
            <div style="margin-bottom: 10px">
              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 6px">区域</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px">
                <span
                  :class="['filter-tag', { active: !animationFilterRegion }]"
                  @click="animationFilterRegion = ''"
                >全部</span>
                <span
                  v-for="r in animationRegionOptions"
                  :key="r"
                  :class="['filter-tag', { active: animationFilterRegion === r }]"
                  @click="animationFilterRegion = r"
                >{{ r }}</span>
              </div>
            </div>

            <!-- 传感器筛选 -->
            <div style="margin-bottom: 10px">
              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 6px">传感器</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px">
                <span
                  :class="['filter-tag', { active: !animationFilterSensor }]"
                  @click="animationFilterSensor = null"
                >全部</span>
                <span
                  :class="['filter-tag', { active: animationFilterSensor === 'sentinel2' }]"
                  @click="animationFilterSensor = 'sentinel2'"
                >Sentinel-2</span>
                <span
                  :class="['filter-tag', { active: animationFilterSensor === 'landsat8' }]"
                  @click="animationFilterSensor = 'landsat8'"
                >Landsat-8</span>
                <span
                  :class="['filter-tag', { active: animationFilterSensor === 'landsat9' }]"
                  @click="animationFilterSensor = 'landsat9'"
                >Landsat-9</span>
                <span
                  :class="['filter-tag', { active: animationFilterSensor === 'mixed' }]"
                  @click="animationFilterSensor = 'mixed'"
                >Mixed</span>
              </div>
            </div>

            <!-- Select datasets for animation - using table like coastline selection -->
            <div style="position: relative; z-index: 1; margin-bottom: 12px; overflow: visible">
              <el-table
                :data="animationAvailableDatasets"
                size="small"
                :fit="false"
                style="width: 100%"
                height="300"
                @selection-change="onAnimationSelectionChange"
              >
                <el-table-column type="selection" width="40" />
                <el-table-column prop="regionName" label="区域" width="90" />
                <el-table-column label="年份" width="80">
                  <template #default="{ row }">{{ new Date(row.date).getFullYear() }}</template>
                </el-table-column>
                <el-table-column prop="sensor" label="数据源" width="80" />
                <el-table-column label="类型" width="80">
                  <template #default="{ row }">{{ row.dataType === 'reference' ? '参考线' : '海岸线' }}</template>
                </el-table-column>
              </el-table>
            </div>

            <!-- Animation controls -->
            <div v-if="animationDatasets.length >= 2" style="margin-bottom: 12px">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
                <el-button size="small" type="primary" :loading="animationGenerating" @click="generateAnimation">
                  生成动画
                </el-button>
                <el-button size="small" @click="clearAnimation">清空</el-button>
              </div>

              <!-- Playback controls -->
              <div v-if="animationFrames.length > 0" style="background: #f5f5f5; padding: 12px; border-radius: 6px">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
                  <el-button size="small" :icon="animationPlaying ? VideoPause : VideoPlay" circle @click="toggleAnimation" />
                  <el-slider
                    v-model="animationFrameIndex"
                    :min="0"
                    :max="animationFrames.length - 1"
                    :show-tooltip="false"
                    style="flex: 1"
                  />
                  <span style="font-size: 12px; white-space: nowrap">
                    {{ animationFrameIndex + 1 }} / {{ animationFrames.length }}
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px">
                  <span style="font-size: 12px">速度：</span>
                  <el-slider
                    v-model="animationSpeed"
                    :min="0.2"
                    :max="2"
                    :step="0.1"
                    :marks="{ 0.2: '0.5秒', 0.5: '1秒', 1: '2秒', 2: '5秒' }"
                    style="flex: 1"
                  />
                  <span style="font-size: 11px; white-space: nowrap; min-width: 45px">
                    {{ Math.round(2000 / animationSpeed / 1000) }}秒/帧
                  </span>
                </div>
                <div style="margin-top: 8px; font-size: 12px; text-align: center">
                  <el-tag type="info">{{ animationYearLabel }}</el-tag>
                </div>
              </div>
            </div>

            <div v-if="animationError" style="color: #f56c6c; font-size: 12px; margin-top: 8px">
              {{ animationError }}
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, onUnmounted, reactive, ref, watch, computed } from "vue";
import { Download, Camera, VideoPlay, VideoPause } from "@element-plus/icons-vue";

import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import Graphic from "@arcgis/core/Graphic.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine.js";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils.js";
import Sketch from "@arcgis/core/widgets/Sketch.js";
import ScaleBar from "@arcgis/core/widgets/ScaleBar.js";
import Compass from "@arcgis/core/widgets/Compass.js";
import * as echarts from "echarts";

import { api } from "../utils/api";
import { getDatasetColorWithAlpha, getDatasetColorString, DATASET_COLORS } from "../utils/colors";
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";

// 侧边栏宽度控制
const panelWidth = ref(380);
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(380);

function startResize(e: MouseEvent) {
  isResizing.value = true;
  startX.value = e.clientX;
  startWidth.value = panelWidth.value;
  
  document.addEventListener("mousemove", doResize);
  document.addEventListener("mouseup", stopResize);
}

function doResize(e: MouseEvent) {
  if (!isResizing.value) return;
  const delta = e.clientX - startX.value;
  // 拖拽方向反向：向右拖拽让侧边栏变窄，向左拖拽让侧边栏变宽
  const newWidth = startWidth.value - delta;
  // 限制宽度范围：最小280，最大600
  panelWidth.value = Math.max(280, Math.min(600, newWidth));
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener("mousemove", doResize);
  document.removeEventListener("mouseup", stopResize);
}

type Dataset = {
  id: string;
  name: string;
  sensor: string;
  date: string;
  regionName: string;
  method: string;
  dataType?: string;
  coastlineType?: string;
  coastlineSubtype?: string;
  originalDataPath?: string;
};

type StationRecord = {
  id: string;
  name: string;
  regionName: string;
  location: any;
};

type StationObservation = {
  id: string;
  at: string;
  sst: number;
  salinity: number;
  turbidity: number;
  chlorophyll: number;
  dissolvedOxygen: number;
};

const mapEl = ref<HTMLDivElement | null>(null);
const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const datasets = ref<Dataset[]>([]);
const selected = ref<Dataset | null>(null);
// 多选相关
const selectedDatasets = ref<Dataset[]>([]);
const activeTab = ref<"datasets" | "basemap" | "stations" | "comments" | "search" | "analysis">("datasets");

// 颜色配置已移至 utils/colors.ts

// 按名称分组的树形数据（已废弃，仅保留用于兼容）
const groupedDatasets = ref<any[]>([]);

function onSelectRow(row: Dataset | null) {
  if (row) {
    onSelect(row);
  }
}

// 多选相关函数
function onSelectionChange(selection: Dataset[]) {
  selectedDatasets.value = selection;
}

// 单击行触发选择
function onRowClick(row: Dataset) {
  selected.value = row;
  onSelect(row);
  // 记录浏览历史
  recordBrowseHistory(row.id);
}

// Animation table selection handler
function onAnimationSelectionChange(selection: Dataset[]) {
  animationDatasets.value = selection.map(ds => ds.id);
}

// 记录浏览历史
async function recordBrowseHistory(datasetId: string) {
  try {
    await api.post("/api/users/me/browse-history", { datasetId });
  } catch {
    // 忽略浏览历史记录失败
  }
}

function getYearFromDate(date: string | Date): string {
  return new Date(date).getFullYear().toString();
}

// 获取数据集的颜色
function getDatasetColor(datasetId: string): number[] {
  const index = selectedDatasets.value.findIndex(ds => ds.id === datasetId);
  return getDatasetColorWithAlpha(index, 0.9);
}

// 获取数据集颜色字符串（用于模板）
function getDatasetColorStr(index: number): string {
  return getDatasetColorString(index);
}

// 加载选中的多个数据集
async function loadSelectedDatasets() {
  if (!view || !shorelineLayer || selectedDatasets.value.length === 0) return;
  
  shorelineLayer.removeAll();
  analysisResultLayer?.removeAll();
  analysis.matches = [];
  
  let loadedCount = 0;
  let allValid = true;
  
  for (let i = 0; i < selectedDatasets.value.length; i++) {
    const ds = selectedDatasets.value[i];
    const color = getDatasetColorWithAlpha(i, 0.9);
    
    try {
      const res = await api.get(`/api/datasets/${ds.id}/shoreline`);
      const fc = res.data.geojson;
      
      const validFeatures = fc?.features?.filter(f => f?.geometry) || [];
      if (validFeatures.length === 0) {
        continue;
      }
      
      const lineSymbol = {
        type: "simple-line",
        color: color,
        width: 0.8,
      } as any;
      
      for (const f of validFeatures) {
        if (!f?.geometry) continue;
        if (f.geometry.type !== "LineString" && f.geometry.type !== "MultiLineString") continue;
        
        const paths = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
        
        const geom = new Polyline({
          paths,
          spatialReference: { wkid: 4326 },
        });
        const geomInView = toViewSRIfNeeded(geom) as any;
        
        shorelineLayer!.add(
          new Graphic({
            geometry: geomInView,
            symbol: lineSymbol,
            attributes: {
              datasetName: ds.name,
              sensor: ds.sensor,
              sensorLabel: sensorLabel(ds.sensor),
              date: ds.date,
              regionName: ds.regionName,
              method: ds.method,
              year: getYearFromDate(ds.date),
              ...f.properties,
            },
            popupTemplate: {
              title: "{datasetName} ({year}年)",
              content:
                "<div><b>传感器：</b>{sensorLabel}</div><div><b>区域：</b>{regionName}</div><div><b>日期：</b>{date}</div>" +
                "<div><b>方法：</b>{method}</div>",
            },
          }),
        );
      }
      
      loadedCount++;
    } catch (e) {
      console.error("加载失败:", ds.name, e);
    }
  }
  
if (loadedCount > 0) {
    // 设置选中的第一个数据集用于详情显示
    selected.value = selectedDatasets.value[0];
    
    // 使用与单选相同的方式定位 - 根据区域名
    const firstDs = selectedDatasets.value[0];
    const regionCenter = getRegionCenter(firstDs.regionName);
    const regionZoom = getRegionZoom(firstDs.regionName);
    await view.goTo({
      center: regionCenter,
      zoom: regionZoom,
    }, { duration: 400 });
    
    ElMessage.success(`已加载 ${loadedCount} 个数据集的海岸线`);
  } else {
    ElMessage.warning("选中的数据集均无有效海岸线数据");
  }
}

// 完全独立的筛选变量 - 每个 el-select 使用自己的 ref，避免相互干扰
const filterRegion = ref("");
const filterSensor = ref<string | null>(null);
const filterDataType = ref<string | null>(null);
const filterStartDate = ref("");
const filterEndDate = ref("");

const regionOptions = ref<string[]>([]);

// 兼容旧的 filters 对象（如果其他代码引用了它）
const filters = {
  get regionName() { return filterRegion.value; },
  set regionName(v) { filterRegion.value = v; },
  get sensor() { return filterSensor.value; },
  set sensor(v) { filterSensor.value = v; },
  get dataType() { return filterDataType.value; },
  set dataType(v) { filterDataType.value = v; },
  get startDate() { return filterStartDate.value; },
  set startDate(v) { filterStartDate.value = v; },
  get endDate() { return filterEndDate.value; },
  set endDate(v) { filterEndDate.value = v; },
};

let view: MapView | null = null;
let shorelineLayer: GraphicsLayer | null = null;
let globalLayer: GraphicsLayer | null = null;
let stationLayer: GraphicsLayer | null = null;
let analysisDrawLayer: GraphicsLayer | null = null;
let analysisOverlayLayer: GraphicsLayer | null = null;
let analysisResultLayer: GraphicsLayer | null = null;
const basemapId = ref("osm");
const showGlobalCoastline = ref(true);
const globalRefDatasets = ref<Dataset[]>([]);
const selectedGlobalDatasetId = ref<string>("");

const stations = ref<StationRecord[]>([]);
const stationRegion = ref<string | null>(null);
const stationRegions = ref<string[]>([]);
const filteredStations = ref<StationRecord[]>([]);
const selectedStation = ref<{ id: string; name: string; regionName: string } | null>(null);
const stationObs = ref<StationObservation[]>([]);
const chartEl = ref<HTMLDivElement | null>(null);
let chart: any = null;

const realtimeLoading = ref(false);
const realtime = reactive<{
  at: string | null;
  sst: number | null;
  salinity: number | null;
  turbidity: number | null;
  chlorophyll: number | null;
  dissolvedOxygen: number | null;
}>({
  at: null,
  sst: null,
  salinity: null,
  turbidity: null,
  chlorophyll: null,
  dissolvedOxygen: null,
});
let realtimeTimer: any = null;

const commentsLoading = ref(false);
const comments = ref<{ id: string; username: string; text: string; createdAt: string; replies?: { id: string; username: string; text: string; replyTo?: string; createdAt: string }[] }[]>([]);
const newComment = ref("");
// 回复功能
const replyTo = ref<{ id: string; username: string } | null>(null);

const searchQ = ref("coastline geojson");
const searchLoading = ref(false);
const searchResults = ref<
  { id: string; title: string; type: string; url?: string; snippet?: string; owner: string; access: string }[]
>([]);

const sketchEl = ref<HTMLDivElement | null>(null);
let sketch: Sketch | null = null;

const analysis = reactive<{
  bufferEnabled: boolean;
  bufferMeters: number;
  hasGeometry: boolean;
  geometryType: string;
  lengthMeters: number | null;
  areaSqm: number | null;
  matches: { id: string; datasetName: string; sensor: string; date: string; graphic: any }[];
  selectedMatchId: string | null;
}>({
  bufferEnabled: true,
  bufferMeters: 200,
  hasGeometry: false,
  geometryType: "-",
  lengthMeters: null,
  areaSqm: null,
  matches: [],
  selectedMatchId: null,
});

let analysisGeometry: any = null;

// Animation state
const animationDatasets = ref<string[]>([]);
const animationGenerating = ref(false);
const animationPlaying = ref(false);
const animationFrameIndex = ref(0);
const animationSpeed = ref(1); // Default slower speed
const animationFrames = ref<{ year: number; geojson: any }[]>([]);
const animationError = ref("");
let animationTimer: any = null;
let animationLayer: GraphicsLayer | null = null;

// 监听标签页切换，在适当时候清空图层
watch(activeTab, (newTab) => {
  if (newTab === "datasets") {
    // 进入数据集页面时，清空动画图层
    animationLayer?.removeAll();
    pauseAnimation();
    animationFrames.value = [];
    animationDatasets.value = [];
  }
});

// Animation filters
const animationFilterRegion = ref("");
const animationFilterSensor = ref<string | null>(null);
const animationRegionOptions = ref<string[]>([]);

// Available datasets for animation - filtered list
const animationAvailableDatasets = computed(() => {
  // Debug: log count
  console.log("[animation] datasets count:", datasets.value?.length, datasets.value);
  // If no datasets, return empty array
  if (!datasets.value || datasets.value.length === 0) return [];
  let result = datasets.value;
  
  // Apply region filter
  if (animationFilterRegion.value) {
    result = result.filter(d => d.regionName === animationFilterRegion.value);
  }
  
  // Apply sensor filter
  if (animationFilterSensor.value) {
    result = result.filter(d => d.sensor === animationFilterSensor.value);
  }
  
  return result
    .filter(d => d && d.id && d.date)  // Basic validation
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
});

const animationYearLabel = computed(() => {
  if (animationFrames.value.length === 0) return "";
  const frame = animationFrames.value[animationFrameIndex.value];
  return frame ? `${frame.year}年` : "";
});

const XIAMEN_CENTER: [number, number] = [118.14, 24.48];
const XIAMEN_ZOOM = 11;
// 中国默认中心（当数据集无有效范围时使用）
const CHINA_CENTER: [number, number] = [115.0, 32.0];
const CHINA_ZOOM = 4;

// 区域中心坐标和缩放级别
const REGION_MAP: Record<string, { center: [number, number]; zoom: number }> = {
  "海南": { center: [109.5, 19.2], zoom: 7 },
  "东海区": { center: [122.0, 27.0], zoom: 6 },
  "粤港澳大湾区": { center: [113.5, 22.5], zoom: 8 },
  "广西": { center: [108.5, 22.0], zoom: 7 },
  "渤海湾": { center: [119.0, 38.5], zoom: 8 },
  "东京湾": { center: [139.7, 35.6], zoom: 9 },
  "旧金山湾": { center: [-122.3, 37.6], zoom: 9 },
  "斯里兰卡": { center: [80.5, 7.5], zoom: 7 },
  "瑙鲁": { center: [166.9, -0.5], zoom: 12 },
  "Nauru": { center: [166.9, -0.5], zoom: 12 },
  "Global": { center: [0, 20], zoom: 2 },
  "China": { center: [105.0, 35.0], zoom: 4 },
};

// 使用 REGION_MAP 的 getRegionCenter/getRegionZoom
function getRegionCenter(regionName: string): [number, number] {
  if (!regionName) return CHINA_CENTER;
  const r = REGION_MAP[regionName];
  if (r) return r.center;
  // 兼容旧逻辑
  if (regionName.includes("海南")) return [109.7, 19.2];
  if (regionName.includes("东海区") || regionName.includes("东海")) return [121.0, 28.0];
  if (regionName.includes("粤港澳") || regionName.includes("大湾区") || regionName.includes("广东")) return [113.5, 22.2];
  if (regionName.includes("广西")) return [108.5, 21.5];
  if (regionName.includes("胶州湾") || regionName.includes("青岛")) return [120.28, 36.05];
  if (regionName.includes("渤海")) return [119.5, 38.5];
  if (regionName.includes("厦门") || regionName.includes("福建") || regionName.includes("Xiamen")) return [118.1, 24.5];
  if (regionName.includes("东京")) return [139.7, 35.6];
  if (regionName.includes("旧金山") || regionName.includes("San Francisco")) return [-122.3, 37.6];
  if (regionName.includes("斯里兰卡") || regionName.includes("Sri Lanka")) return [80.5, 7.5];
  if (regionName.includes("瑙鲁") || regionName.includes("Nauru")) return [166.9, -0.5];
  return CHINA_CENTER;
}

function getRegionZoom(regionName: string): number {
  if (!regionName) return CHINA_ZOOM;
  const r = REGION_MAP[regionName];
  if (r) return r.zoom;
  // 兼容旧逻辑
  if (regionName?.includes("海南")) return 9;
  if (regionName?.includes("东海区") || regionName?.includes("东海")) return 6;
  if (regionName?.includes("粤港澳") || regionName?.includes("大湾区") || regionName?.includes("广东")) return 9;
  if (regionName?.includes("广西")) return 8;
  if (regionName?.includes("胶州湾") || regionName?.includes("青岛")) return 10;
  if (regionName?.includes("渤海")) return 8;
  if (regionName?.includes("厦门") || regionName?.includes("福建") || regionName?.includes("Xiamen")) return 11;
  if (regionName?.includes("东京")) return 9;
  if (regionName?.includes("旧金山") || regionName?.includes("San Francisco")) return 9;
  if (regionName?.includes("斯里兰卡") || regionName?.includes("Sri Lanka")) return 7;
  if (regionName?.includes("瑙鲁") || regionName?.includes("Nauru")) return 12;
  return CHINA_ZOOM;
}

function isXiamenDataset(row: any): boolean {
  return row.regionName?.includes("厦门") || row.name?.includes("厦门");
}

const localShorelineDatasets = ref<Dataset[]>([]);
const changeAnalysis = reactive<{
  fromDatasetId: string;
  toDatasetId: string;
  loading: boolean;
  result: null | { fromLengthMeters: number; toLengthMeters: number; deltaMeters: number; deltaPct: number };
}>({
  fromDatasetId: "",
  toDatasetId: "",
  loading: false,
  result: null,
});

const usernameText = ref("同学");
const greetingText = ref("早上好");
const nowText = ref("");
const locationText = ref("定位中...");
const weatherText = ref("获取中");
const temperatureText = ref("");
const clothingRecommendation = ref("");
let clockTimer: any = null;

// 根据天气和温度给出穿衣建议
function getClothingRecommendation(weatherCode: number, temperature: number): string {
  // 获取天气类型
  const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(weatherCode);
  const isSnowy = [71, 73, 75].includes(weatherCode);
  const isFoggy = [45, 48].includes(weatherCode);
  const isCloudy = [1, 2, 3].includes(weatherCode);
  const isClear = weatherCode === 0;

  if (isRainy) {
    if (temperature >= 25) return "🌂 带伞，建议穿轻便防水外套";
    if (temperature >= 15) return "🌂 带伞，建议穿冲锋衣或雨衣";
    return "🌂 带伞，建议穿防风保暖外套";
  }
  if (isSnowy) {
    if (temperature > 0) return "❄️ 注意防滑，建议穿羽绒服";
    return "❄️ 严寒警报，建议穿厚羽绒服和防寒靴";
  }
  if (isFoggy) {
    return "🌫️ 能见度低，建议穿亮色外套，注意出行安全";
  }

  // 晴天/多云/阴天根据温度推荐
  if (temperature >= 30) return "☀️ 高温预警，建议穿轻薄透气衣物，注意防晒";
  if (temperature >= 25) return "👕 温暖舒适，建议穿短袖或薄长袖";
  if (temperature >= 18) return "👔 早晚偏凉，建议穿薄外套或长袖";
  if (temperature >= 10) return "🧥 气温较低，建议穿外套或轻羽绒服";
  if (temperature >= 0) return "🧣 寒冷天气，建议穿羽绒服或厚外套";
  return "🥶 严寒天气，建议穿厚羽绒服、围巾和手套";
}

function getGreetingByHour(h: number) {
  if (h < 12) return "早上好";
  if (h < 18) return "下午好";
  return "晚上好";
}

function updateClockText() {
  const now = new Date();
  nowText.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  greetingText.value = getGreetingByHour(now.getHours());
}

function weatherCodeLabel(code: number) {
  const map: Record<number, string> = {
    0: "晴",
    1: "晴间多云",
    2: "多云",
    3: "阴",
    45: "雾",
    48: "冻雾",
    51: "小毛毛雨",
    53: "毛毛雨",
    55: "强毛毛雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    80: "阵雨",
    81: "较强阵雨",
    82: "强阵雨",
    95: "雷雨",
  };
  return map[code] ?? "未知";
}

async function loadRealtimeWeather(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather api failed");
    const data = await res.json();
    const cw = data?.current_weather;
    if (!cw) throw new Error("no current weather");
    weatherText.value = weatherCodeLabel(Number(cw.weathercode));
    const temp = Number(cw.temperature);
    temperatureText.value = typeof temp === "number" ? `，${temp.toFixed(1)}°C` : "";
    // 计算穿衣推荐
    clothingRecommendation.value = getClothingRecommendation(Number(cw.weathercode), temp);
  } catch {
    weatherText.value = "获取失败";
    temperatureText.value = "";
    clothingRecommendation.value = "";
  }
}

function initUserInfo() {
  usernameText.value = auth.user?.username || "同学";
}

function initLocationAndWeather() {
  if (!navigator.geolocation) {
    locationText.value = "浏览器不支持定位";
    weatherText.value = "不可用";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = Number(pos.coords.latitude.toFixed(4));
      const lon = Number(pos.coords.longitude.toFixed(4));
      locationText.value = `${lat}°, ${lon}°`;
      loadRealtimeWeather(lat, lon);
    },
    () => {
      locationText.value = "定位失败（请允许定位权限）";
      weatherText.value = "不可用";
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
  );
}

function formatDate(d: string) {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtTime(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(
    2,
    "0",
  )} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

function fmtMeters(m: number) {
  if (!Number.isFinite(m)) return "-";
  if (m >= 1000) return `${(m / 1000).toFixed(3)} km`;
  return `${m.toFixed(2)} m`;
}

function fmtSqm(a: number) {
  if (!Number.isFinite(a)) return "-";
  if (a >= 1_000_000) return `${(a / 1_000_000).toFixed(4)} km²`;
  return `${a.toFixed(2)} m²`;
}

function sensorLabel(sensor: string) {
  if (sensor === "sentinel2") return "Sentinel-2";
  if (sensor === "landsat8") return "Landsat-8";
  if (sensor === "landsat9") return "Landsat-9";
  return "Mixed";
}

// Animation functions
// Uniformly resample a line string to a target number of points
// Uses geodesic distance along the line
function resampleLineString(coords: number[][], targetPoints: number): number[][] {
  if (coords.length < 2) return coords;
  if (targetPoints <= 2) return [coords[0], coords[coords.length - 1]];

  // Calculate cumulative distance along the line
  let totalLength = 0;
  const distances: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    totalLength += Math.sqrt(dx * dx + dy * dy);
    distances.push(totalLength);
  }

  if (totalLength === 0) {
    // Degenerate line (all same point) - return evenly spaced copies of first point
    return Array.from({ length: targetPoints }, () => [...coords[0]]);
  }

  // Resample at uniform distance intervals
  const result: number[][] = [];
  for (let i = 0; i < targetPoints; i++) {
    const targetDist = (totalLength / (targetPoints - 1)) * i;

    // Binary search for the segment containing targetDist
    let segIdx = 0;
    let lo = 0, hi = distances.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (distances[mid] < targetDist) lo = mid + 1;
      else hi = mid;
    }
    segIdx = Math.max(0, lo - 1);

    // Interpolate within the segment
    const d0 = distances[segIdx];
    const d1 = distances[segIdx + 1] ?? totalLength;
    const segLen = d1 - d0;
    const t = segLen > 0 ? (targetDist - d0) / segLen : 0;

    result.push([
      coords[segIdx][0] + t * (coords[segIdx + 1][0] - coords[segIdx][0]),
      coords[segIdx][1] + t * (coords[segIdx + 1][1] - coords[segIdx][1])
    ]);
  }

  return result;
}

// --- Feature-level spatial correspondence helpers ---

// Get the centroid of a Feature's geometry (for rough correspondence matching)
function getFeatureCentroid(f: any): [number, number] | null {
  if (!f?.geometry) return null;
  const type = f.geometry.type;
  let coords: number[][] = [];

  if (type === "LineString") {
    coords = f.geometry.coordinates;
  } else if (type === "MultiLineString") {
    for (const line of f.geometry.coordinates) {
      coords.push(...line);
    }
  } else if (type === "Polygon") {
    coords = f.geometry.coordinates[0]; // outer ring
  } else if (type === "MultiPolygon") {
    coords = f.geometry.coordinates[0][0];
  }

  if (coords.length === 0) return null;

  const sumX = coords.reduce((s, c) => s + c[0], 0);
  const sumY = coords.reduce((s, c) => s + c[1], 0);
  return [sumX / coords.length, sumY / coords.length];
}

// Get all coordinate segments from a feature as discrete point pairs (for correspondence building)
function getFeatureCoords(f: any): number[][] {
  const coords: number[][] = [];
  if (!f?.geometry) return coords;
  const type = f.geometry.type;

  if (type === "LineString") {
    coords.push(...f.geometry.coordinates);
  } else if (type === "MultiLineString") {
    for (const line of f.geometry.coordinates) {
      coords.push(...line);
    }
  } else if (type === "Polygon") {
    // Remove closing duplicate point
    const ring = f.geometry.coordinates[0];
    for (let i = 0; i < ring.length - 1; i++) {
      coords.push(ring[i]);
    }
  } else if (type === "MultiPolygon") {
    for (const poly of f.geometry.coordinates) {
      const ring = poly[0];
      for (let i = 0; i < ring.length - 1; i++) {
        coords.push(ring[i]);
      }
    }
  }
  return coords;
}

// Find the perpendicular projection of point p onto segment [a, b]
function nearestPointOnSegment(p: number[], a: number[], b: number[]): number[] {
  const ax = b[0] - a[0];
  const ay = b[1] - a[1];
  const px = p[0] - a[0];
  const py = p[1] - a[1];

  const lenSq = ax * ax + ay * ay;
  if (lenSq === 0) return [...a];

  let t = (px * ax + py * ay) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return [a[0] + t * ax, a[1] + t * ay];
}

// Get the cumulative distance along a line (arc length at each point)
function getArcLengths(coords: number[][]): number[] {
  const dists = [0];
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    dists.push(dists[dists.length - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return dists;
}

// Find the start/end endpoints of a line by arc-length from centroid.
// Returns [isReversed] — true if target should be traversed in reverse to match source start.
function getEndpointsForMatching(sourceCoords: number[][], targetCoords: number[][]): boolean {
  // Compute cumulative distance from centroid for each line's endpoints
  const avgOf = (coords: number[][]): [number, number] => {
    let sx = 0, sy = 0;
    for (const c of coords) { sx += c[0]; sy += c[1]; }
    return [sx / coords.length, sy / coords.length];
  };

  const [scx, scy] = avgOf(sourceCoords);
  const [tcx, tcy] = avgOf(targetCoords);

  const srcEnd = sourceCoords[0];
  const srcLast = sourceCoords[sourceCoords.length - 1];
  const tgtStart = targetCoords[0];
  const tgtLast = targetCoords[targetCoords.length - 1];

  // Distance from centroid to each endpoint for source
  const srcD0 = Math.sqrt((srcEnd[0] - scx) ** 2 + (srcEnd[1] - scy) ** 2);
  const srcD1 = Math.sqrt((srcLast[0] - scx) ** 2 + (srcLast[1] - scy) ** 2);
  // Distance from centroid to each endpoint for target
  const tgtD0 = Math.sqrt((tgtStart[0] - tcx) ** 2 + (tgtStart[1] - tcy) ** 2);
  const tgtD1 = Math.sqrt((tgtLast[0] - tcx) ** 2 + (tgtLast[1] - tcx) ** 2);

  // Match: closest-to-centroid endpoint on source ↔ closest-to-centroid on target
  // But also need to handle reversals — compare both orientations
  const fwdDist =
    Math.sqrt((srcEnd[0] - tgtStart[0]) ** 2 + (srcEnd[1] - tgtStart[1]) ** 2) +
    Math.sqrt((srcLast[0] - tgtLast[0]) ** 2 + (srcLast[1] - tgtLast[1]) ** 2);
  const revDist =
    Math.sqrt((srcEnd[0] - tgtLast[0]) ** 2 + (srcEnd[1] - tgtLast[1]) ** 2) +
    Math.sqrt((srcLast[0] - tgtStart[0]) ** 2 + (srcLast[1] - tgtStart[1]) ** 2);

  return revDist < fwdDist; // if reversed matching is closer, reverse target
}

// Build correspondence from sourceCoords to targetCoords using arc-length parameterization.
// 1. Find best orientation (forward or reversed) for target.
// 2. For each source point at arc-length s, find the target point at arc-length s.
// 3. If target is shorter/longer, the remaining source points map to target's end.
// This ensures points "walk" along the shoreline from one end to the other.
function buildAlongshoreCorrespondence(sourceCoords: number[][],
                                         targetCoords: number[][]): number[][] {
  if (sourceCoords.length === 0 || targetCoords.length === 0) return [];

  const srcLengths = getArcLengths(sourceCoords);
  const srcTotalLen = srcLengths[srcLengths.length - 1];
  const tgtTotalLen = getArcLengths(targetCoords).at(-1) ?? 0;

  // Determine if we need to reverse target
  const reversed = getEndpointsForMatching(sourceCoords, targetCoords);
  const tCoords = reversed ? [...targetCoords].reverse() : targetCoords;
  const tgtLengths = getArcLengths(tCoords);

  const correspondence: number[][] = [];

  for (let i = 0; i < sourceCoords.length; i++) {
    const srcArcLen = srcLengths[i];
    // Map to same fraction along the target line
    const ratio = srcTotalLen > 0 ? srcArcLen / srcTotalLen : 0;
    const tgtArcLen = ratio * (tgtTotalLen > 0 ? tgtTotalLen : 0);

    // Binary search for target segment at tgtArcLen
    let lo = 0, hi = tgtLengths.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (tgtLengths[mid] < tgtArcLen) lo = mid + 1;
      else hi = mid;
    }
    const segIdx = Math.max(0, lo - 1);
    const segLen = tgtLengths[segIdx + 1] - tgtLengths[segIdx];
    const t = segLen > 0 ? (tgtArcLen - tgtLengths[segIdx]) / segLen : 0;

    correspondence.push([
      tCoords[segIdx][0] + t * (tCoords[segIdx + 1][0] - tCoords[segIdx][0]),
      tCoords[segIdx][1] + t * (tCoords[segIdx + 1][1] - tCoords[segIdx][1])
    ]);
  }

  return correspondence;
}

// Morph a source feature towards a target feature by interpolation factor [0..1]
// factor=0 → source stays, factor=1 → source becomes target shape
function morphFeature(sourceF: any, targetF: any, factor: number): any {
  const sourceCoords = getFeatureCoords(sourceF);
  const targetCoords = getFeatureCoords(targetF);

  if (sourceCoords.length < 2 || targetCoords.length < 2) {
    // Can't morph - return source as-is
    return { ...sourceF };
  }

  // Resample both to same point count for clean interpolation
  const targetPoints = Math.max(sourceCoords.length, targetCoords.length, 20);
  const resampledSource = resampleLineString(sourceCoords, targetPoints);
  const resampledTarget = resampleLineString(targetCoords, targetPoints);

  // Build correspondence: where does each source point want to go on the target?
  const corr = buildAlongshoreCorrespondence(resampledSource, resampledTarget);

  // Interpolate
  const interpCoords = resampledSource.map((srcPt, i) => [
    srcPt[0] + factor * (corr[i][0] - srcPt[0]),
    srcPt[1] + factor * (corr[i][1] - srcPt[1])
  ]);

  const geomType = sourceF.geometry.type;
  return {
    ...sourceF,
    geometry: {
      ...sourceF.geometry,
      coordinates: geomType === "LineString" || geomType === "MultiLineString"
        ? interpCoords
        : interpCoords // for polygon, wrap as ring
    }
  };
}

// Compute bounding box of a Feature for rough spatial matching
function getFeatureBounds(f: any): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const coords = getFeatureCoords(f);
  if (coords.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of coords) {
    if (c[0] < minX) minX = c[0];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[1] > maxY) maxY = c[1];
  }
  return { minX, minY, maxX, maxY };
}

// Check if two feature bounding boxes overlap significantly
function featuresOverlap(b1: { minX: number; minY: number; maxX: number; maxY: number },
                          b2: { minX: number; minY: number; maxX: number; maxY: number },
                          threshold = 0.3): boolean {
  const overlapX = Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX);
  const overlapY = Math.min(b1.maxY, b2.maxY) - Math.max(b1.minY, b2.minY);
  if (overlapX <= 0 || overlapY <= 0) return false;

  const w1 = b1.maxX - b1.minX;
  const h1 = b1.maxY - b1.minY;
  const w2 = b2.maxX - b2.minX;
  const h2 = b2.maxY - b2.minY;
  const overlapArea = overlapX * overlapY;
  const minArea = Math.min(w1 * h1, w2 * h2);

  return overlapArea / minArea >= threshold;
}

// Find the best matching target feature for a source feature
function findMatchingFeature(
  sourceF: any,
  targetFeatures: any[],
  usedTargets: Set<number>
): number {
  const sb = getFeatureBounds(sourceF);
  if (!sb) return -1;

  let bestIdx = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < targetFeatures.length; i++) {
    if (usedTargets.has(i)) continue;

    const tb = getFeatureBounds(targetFeatures[i]);
    if (!tb) continue;

    // Use centroid distance as primary score
    const sc = getFeatureCentroid(sourceF);
    const tc = getFeatureCentroid(targetFeatures[i]);
    if (!sc || !tc) continue;

    const dx = sc[0] - tc[0];
    const dy = sc[1] - tc[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Also consider bounding box overlap
    const overlap = featuresOverlap(sb, tb, 0.1);

    // Score: closer distance + overlap bonus
    const score = overlap ? 1000 - dist : 100 / (1 + dist);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

// Morph between two FeatureCollections using spatial correspondence
// factor=0 → keep sourceFC, factor=1 → morph to targetFC shape, 0<factor<1 → in between
function morphFeatureCollections(sourceFC: any, targetFC: any, factor: number): any {
  if (factor <= 0) return sourceFC;
  if (factor >= 1) return targetFC;
  if (!sourceFC?.features || !targetFC?.features) return sourceFC;

  const srcFeatures = sourceFC.features.filter((f: any) => f?.geometry);
  const tgtFeatures = targetFC.features.filter((f: any) => f?.geometry);
  if (srcFeatures.length === 0 || tgtFeatures.length === 0) return sourceFC;

  const usedTargets = new Set<number>();
  const resultFeatures: any[] = [];

  // First pass: match features that have clear spatial correspondence
  for (const srcF of srcFeatures) {
    const matchIdx = findMatchingFeature(srcF, tgtFeatures, usedTargets);

    if (matchIdx >= 0) {
      usedTargets.add(matchIdx);
      resultFeatures.push(morphFeature(srcF, tgtFeatures[matchIdx], factor));
    } else {
      // No matching target feature found - just keep source (with tiny morph to nearest)
      resultFeatures.push({ ...srcF });
    }
  }

  return {
    type: "FeatureCollection",
    features: resultFeatures
  };
}

// --- Legacy correspondence helpers (kept for findMatchingFeature) ---
// Then each interpolation frame just does a trivial linear lerp — no spatial matching
type PrecomputedMorph = {
  srcFeature: any;
  resampledCoords: number[][];
  corrTargets: number[][];
};

function precomputeMorph(sourceFC: any, targetFC: any): PrecomputedMorph[] {
  const srcFeatures = (sourceFC?.features || []).filter((f: any) => f?.geometry);
  const tgtFeatures = (targetFC?.features || []).filter((f: any) => f?.geometry);
  if (srcFeatures.length === 0 || tgtFeatures.length === 0) return [];

  // Pre-compute matches
  const usedTargets = new Set<number>();
  const matches: { sourceIdx: number; targetIdx: number }[] = [];
  for (let si = 0; si < srcFeatures.length; si++) {
    const matchIdx = findMatchingFeature(srcFeatures[si], tgtFeatures, usedTargets);
    if (matchIdx >= 0) {
      usedTargets.add(matchIdx);
      matches.push({ sourceIdx: si, targetIdx: matchIdx });
    }
  }

  // Pre-compute resampled coords + correspondence for each match (once, not per frame)
  const result: PrecomputedMorph[] = [];
  const gridSize = 30; // Fixed grid for fast interpolation
  for (const m of matches) {
    const sf = srcFeatures[m.sourceIdx];
    const tf = tgtFeatures[m.targetIdx];
    const sc = getFeatureCoords(sf);
    const tc = getFeatureCoords(tf);
    if (sc.length < 2 || tc.length < 2) continue;

    // Use alongshore correspondence (arc-length parameterization + orientation detection)
    const resS = resampleLineString(sc, gridSize);
    const resT = resampleLineString(tc, gridSize);
    const corr = buildAlongshoreCorrespondence(resS, resT);

    result.push({ srcFeature: sf, resampledCoords: resS, corrTargets: corr });
  }

  return result;
}

// Fast interpolation using pre-computed morphs (just lerp, no spatial matching)
function interpolateMorph(precomputed: PrecomputedMorph[], sourceFC: any, factor: number): any {
  if (factor <= 0) return sourceFC;

  const resultFeatures = precomputed.map(m => {
    const interpCoords = m.resampledCoords.map((pt, k) => [
      pt[0] + factor * (m.corrTargets[k][0] - pt[0]),
      pt[1] + factor * (m.corrTargets[k][1] - pt[1])
    ]);
    return { ...m.srcFeature, geometry: { ...m.srcFeature.geometry, coordinates: interpCoords } };
  });

  // Add unmatched source features (those not in precomputed)
  const srcFeatures = (sourceFC?.features || []).filter((f: any) => f?.geometry);
  const precomputedSrcCoords = precomputed.map(p => JSON.stringify(p.resampledCoords));
  for (const sf of srcFeatures) {
    const sc = getFeatureCoords(sf);
    const scKey = JSON.stringify(sc.slice(0, 5)); // compare first 5 coords as rough dedup
    if (!precomputedSrcCoords.some(k => k === scKey)) {
      resultFeatures.push({ ...sf });
    }
  }

  return { type: "FeatureCollection", features: resultFeatures };
}

// --- End correspondence helpers ---

async function generateAnimation() {
  if (animationDatasets.value.length < 2) {
    animationError.value = "请至少选择2个数据集";
    return;
  }

  const selectedDs = animationAvailableDatasets.value.filter(ds => 
    animationDatasets.value.includes(ds.id)
  );
  
  if (selectedDs.length < 2) {
    animationError.value = "请至少选择2个有效数据集";
    return;
  }
  
  animationGenerating.value = true;
  animationError.value = "";
  animationFrames.value = [];
  animationPlaying.value = false;
  animationFrameIndex.value = 0;
  
  try {
    const rawFrames: { dataset: Dataset; geojson: any; year: number }[] = [];
    
    // Load all shoreline data
    for (const ds of selectedDs) {
      const res = await api.get(`/api/datasets/${ds.id}/shoreline`);
      const fc = res.data.geojson;
      if (fc?.features?.length > 0) {
        rawFrames.push({
          dataset: ds,
          geojson: fc,
          year: new Date(ds.date).getFullYear()
        });
      }
    }
    
    if (rawFrames.length < 2) {
      animationError.value = "所选数据集缺乏有效海岸线数据";
      return;
    }

    // Sort by year
    rawFrames.sort((a, b) => a.year - b.year);

    // Collect all frames - one frame per year, no interpolation
    const allFrames: { year: number; geojson: any }[] = rawFrames.map(f => ({
      year: f.year,
      geojson: f.geojson
    }));

    // Push frames to ref in small batches with yields to avoid blocking UI
    // Use a plain array to collect, then batch-assign to Vue ref
    const BATCH_SIZE = 10;
    animationFrames.value = [];

    for (let i = 0; i < allFrames.length; i += BATCH_SIZE) {
      const batch = allFrames.slice(i, i + BATCH_SIZE);
      animationFrames.value.push(...batch);
      // Yield to UI thread every batch so the page stays responsive
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }

    ElMessage.success(`已生成 ${animationFrames.value.length} 个动画帧`);
  } catch (e: any) {
    animationError.value = e?.response?.data?.message || "生成动画失败";
    console.error("[generateAnimation] error:", e);
  } finally {
    animationGenerating.value = false;
  }
}

function toggleAnimation() {
  animationPlaying.value = !animationPlaying.value;
  
  if (animationPlaying.value) {
    playAnimation();
  } else {
    pauseAnimation();
  }
}

function playAnimation() {
  if (animationTimer) clearInterval(animationTimer);
  
  // 播放动画时隐藏全球海岸线（避免干扰）
  if (globalLayer) globalLayer.visible = false;
  
  // 先显示当前帧
  animationFrameIndex.value = 0;
  updateAnimationFrame();
  
  const interval = 2000 / animationSpeed.value;
  animationTimer = setInterval(() => {
    if (animationFrameIndex.value >= animationFrames.value.length - 1) {
      animationFrameIndex.value = 0; // Loop
    } else {
      animationFrameIndex.value++;
    }
    updateAnimationFrame();
  }, interval);
}

function pauseAnimation() {
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
  // 暂停动画后恢复全球海岸线显示
  if (globalLayer) globalLayer.visible = showGlobalCoastline.value;
}

function updateAnimationFrame() {
  if (!animationLayer) return;
  
  animationLayer.removeAll();
  
  const frame = animationFrames.value[animationFrameIndex.value];
  if (!frame?.geojson?.features) return;
  
  const color = [0, 114, 198, 255]; // Blue
  
  for (const f of frame.geojson.features) {
    if (!f?.geometry) continue;
    if (f.geometry.type !== "LineString" && f.geometry.type !== "MultiLineString") continue;
    
    const paths = f.geometry.type === "LineString" 
      ? [f.geometry.coordinates] 
      : f.geometry.coordinates;
    
    const geom = new Polyline({
      paths,
      spatialReference: { wkid: 4326 },
    });
    const geomInView = toViewSRIfNeeded(geom) as any;
    
    animationLayer.add(
      new Graphic({
        geometry: geomInView,
        symbol: {
          type: "simple-line",
          color: color,
          width: 1.2,
        },
      })
    );
  }
}

function clearAnimation() {
  pauseAnimation();
  animationFrames.value = [];
  animationFrameIndex.value = 0;
  animationError.value = "";
  animationDatasets.value = [];
  animationFilterRegion.value = "";
  animationFilterSensor.value = null;
  animationLayer?.removeAll();
}

function toGeographicIfNeeded(g: any) {
  if (!view) return g;
  if (view.spatialReference?.isWebMercator) return webMercatorUtils.webMercatorToGeographic(g) as any;
  return g;
}

function toViewSRIfNeeded(g: any) {
  if (!view) return g;
  if (view.spatialReference?.isWebMercator) return webMercatorUtils.geographicToWebMercator(g) as any;
  return g;
}

async function loadDatasets() {
  loading.value = true;
  try {
    const res = await api.get("/api/datasets", {
      params: {
        regionName: filters.regionName || undefined,
        sensor: filters.sensor || undefined,
        dataType: filters.dataType || undefined,
        dateFrom: filters.startDate ? `${filters.startDate}-01-01` : undefined,
        dateTo: filters.endDate ? `${filters.endDate}-12-31` : undefined,
      },
    });
    // 排序：母集（reference）排前面，子集（shoreline）排后面，同类型内按日期从新到旧
    const allData = res.data.datasets;
    console.log("[loadDatasets] raw datasets:", allData?.length);
    allData.sort((a: Dataset, b: Dataset) => {
      if (a.dataType === "reference" && b.dataType !== "reference") return -1;
      if (a.dataType !== "reference" && b.dataType === "reference") return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    datasets.value = allData;
    // 提取唯一区域名称用于下拉框
    const regions = new Set<string>();
    for (const d of datasets.value) {
      if (d.regionName) regions.add(d.regionName);
    }
    regionOptions.value = Array.from(regions).sort();
    // Update animation region options
    animationRegionOptions.value = Array.from(regions).sort();
    localShorelineDatasets.value = datasets.value.filter((d) => d.dataType !== "reference");
    if (!changeAnalysis.fromDatasetId && localShorelineDatasets.value.length >= 2) {
      const sorted = [...localShorelineDatasets.value].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      changeAnalysis.fromDatasetId = sorted[0].id;
      changeAnalysis.toDatasetId = sorted[sorted.length - 1].id;
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "加载数据集失败");
  } finally {
    loading.value = false;
  }
}

async function autoSelectFirstDataset() {
  const local = datasets.value.filter((d) => d.dataType !== "reference");
  if (local.length === 0) return;
  // 自动选择第一个可用数据集
  const first = [...local].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  if (first) {
    await onSelect(first);
  }
}

async function onSelect(row: Dataset | null) {
  if (!row || !view || !shorelineLayer) return;
  selected.value = row;
  
  // 先尝试加载评论（不阻塞主流程）
  loadComments().catch(() => {});
  
  try {
    const res = await api.get(`/api/datasets/${row.id}/shoreline`);
    const fc = res.data.geojson;

    // 检查是否有有效要素
    const validFeatures = fc?.features?.filter(f => f?.geometry) || [];
    if (validFeatures.length === 0) {
      // 没有地图数据，但仍显示数据集信息，允许下载
      ElMessage.info("该数据集暂无地图展示数据，可点击下载原始数据");
      return;
    }

    shorelineLayer.removeAll();
    analysisResultLayer?.removeAll();
    analysis.matches = [];

    // 使用统一的颜色配置
    const colorIndex = selectedDatasets.value.findIndex(ds => ds.id === row.id);
    const lineColor = getDatasetColorWithAlpha(colorIndex >= 0 ? colorIndex : 0, 0.9);
    const lineSymbol = {
      type: "simple-line",
      color: lineColor,
      width: 0.8,
    } as any;

    for (const f of validFeatures) {
      if (!f?.geometry) continue;
      if (f.geometry.type !== "LineString" && f.geometry.type !== "MultiLineString") continue;

      const paths =
        f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;

      const geom = new Polyline({
        paths,
        spatialReference: { wkid: 4326 },
      });
      const geomInView = toViewSRIfNeeded(geom) as any;

      shorelineLayer.add(
        new Graphic({
          geometry: geomInView,
          symbol: lineSymbol,
          attributes: {
            datasetName: row.name,
            sensor: row.sensor,
            sensorLabel: sensorLabel(row.sensor),
            date: row.date,
            regionName: row.regionName,
            method: row.method,
            ...f.properties,
          },
          popupTemplate: {
            title: "{datasetName}",
            content:
              "<div><b>传感器：</b>{sensorLabel}</div><div><b>区域：</b>{regionName}</div><div><b>日期：</b>{date}</div>" +
              "<div><b>方法：</b>{method}</div>" +
              "<div style='margin-top:6px;opacity:.8'>点击即为“要素属性查询”示例</div>",
          },
        }),
      );
    }

    // 渭河干流数据集使用自动范围调整
    const isWeiheDataset = row.regionName?.includes("渭河") || row.name?.includes("渭河");
    const extent = shorelineLayer.fullExtent;
    console.log("[Map] Shoreline layer extent:", extent);
    console.log("[Map] Is extent valid?", extent && isFinite(extent.xmin) && isFinite(extent.xmax));
    
    if (isWeiheDataset && extent && isFinite(extent.xmin) && isFinite(extent.xmax)) {
      // 渭河数据集：自动根据数据范围调整（甘肃省渭河流域）
      const extentWidth = Math.abs(extent.xmax - extent.xmin);
      const extentHeight = Math.abs(extent.ymax - extent.ymin);
      const extentSize = Math.max(extentWidth, extentHeight);
      console.log("[Map] Weihe extent size:", extentSize);
      
      let targetZoom: number;
      if (extentSize < 0.5) {
        targetZoom = 10;
      } else if (extentSize < 2) {
        targetZoom = 8;
      } else {
        targetZoom = 7;
      }
      const extentCenter = [(extent.xmin + extent.xmax) / 2, (extent.ymin + extent.ymax) / 2];
      await view.goTo({
        center: extentCenter,
        zoom: targetZoom,
        padding: { left: 80, right: 80, top: 80, bottom: 120 }
      }, { duration: 400 });
    } else if (!extent || !isFinite(extent.xmin) || !isFinite(extent.xmax)) {
      // 数据集没有有效范围，缩放到中国
      console.log("[Map] Invalid extent, going to CHINA");
      await view.goTo({ center: CHINA_CENTER, zoom: CHINA_ZOOM }, { duration: 400 });
    } else if (isXiamenDataset(row)) {
      await view.goTo({ center: XIAMEN_CENTER, zoom: XIAMEN_ZOOM }, { duration: 400 });
    } else {
      // 根据区域设置缩放级别
      const regionCenter = getRegionCenter(row.regionName);
      console.log("[Map] Region:", row.regionName, "Center:", regionCenter);
      await view.goTo({ center: regionCenter, zoom: getRegionZoom(row.regionName) }, { duration: 400 });
    }
    await loadComments();
  } catch (e: any) {
    // 没有存储的海岸线数据，但允许下载原始数据
    const status = e?.response?.status;
    if (status === 404 || status === 400) {
      ElMessage.info("该数据集暂无地图数据，可点击下载原始数据");
      await loadComments();
    } else {
      ElMessage.error(e?.response?.data?.message ?? "加载海岸线失败");
    }
  }
}

function clearLayer() {
  shorelineLayer?.removeAll();
  selected.value = null;
  selectedDatasets.value = [];
  comments.value = [];
}

// 跳转到自定义出图页面
function goToExportMap() {
  if (selectedDatasets.value.length === 0) {
    ElMessage.warning("请先选择海岸线");
    return;
  }
  const ids = selectedDatasets.value.map(d => d.id).join(",");
  
  // 只传递选中的数据集ID，让出图页面根据数据自动计算视图
  router.push({ path: "/export-map", query: { datasets: ids } });
}

// 批量下载选中的数据集
async function downloadSelectedDatasets() {
  if (selectedDatasets.value.length === 0) {
    ElMessage.warning("请先选择要下载的数据集");
    return;
  }
  
  const token = localStorage.getItem("coastline.token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  
  ElMessage.info(`正在下载 ${selectedDatasets.value.length} 个数据集...`);
  
  let successCount = 0;
  
  for (const ds of selectedDatasets.value) {
    try {
      const res = await api.get(`/api/datasets/${ds.id}/shoreline`, {
        headers,
        responseType: "blob",
      });
      
      const blob = new Blob([res.data], { type: "application/geo+json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${ds.regionName || "coastline"}-${new Date(ds.date).getFullYear()}.geojson`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      successCount++;
    } catch (e) {
      console.error(`下载失败: ${ds.name}`, e);
    }
  }
  
  ElMessage.success(`成功下载 ${successCount} / ${selectedDatasets.value.length} 个数据集`);
}

// 下载原始数据 - 始终可下载GeoJSON格式
async function downloadOriginalData() {
  if (!selected.value?.id) {
    ElMessage.warning("请先选择数据集");
    return;
  }

  const row = selected.value;
  const token = localStorage.getItem("coastline.token");

  // 如果是外部URL（http/https），直接打开链接
  if (row.originalDataPath && row.originalDataPath.startsWith("http")) {
    ElMessage.info("正在跳转到外部下载链接...");
    window.open(row.originalDataPath, "_blank");
    return;
  }

  // 如果有原始数据路径，尝试下载原始文件
  if (row.originalDataPath) {
    ElMessage.info("正在下载原始数据...");
    try {
      const res = await api.get(`/api/datasets/${row.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: "blob",
      });

      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${row.name || "coastline"}.rar`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      ElMessage.success("下载成功");
    } catch (e) {
      ElMessage.warning("原始文件下载失败，将下载GeoJSON格式");
      // 继续下载GeoJSON
    }
  }

  // 下载GeoJSON格式（始终可用作备选）
  ElMessage.info("正在生成GeoJSON下载...");
  try {
    const res = await api.get(`/api/datasets/${row.id}/shoreline`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: "blob",
    });
    
    const blob = new Blob([res.data], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${row.regionName || "coastline"}-${row.date?.split("-")[0] || ""}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    ElMessage.success("GeoJSON下载成功");
  } catch (e: any) {
    ElMessage.error("下载失败: " + (e?.message || "未知错误"));
  }
}

// 处理表格中的下载按钮
async function handleDownload(row: Dataset) {
  const token = localStorage.getItem("coastline.token");
  if (!token) {
    ElMessage.warning("请先登录");
    return;
  }
  
  if (!row.originalDataPath) {
    // 如果没有原始路径，尝试直接通过API下载GeoJSON
    ElMessage.info("正在生成下载...");
    try {
      const res = await api.get(`/api/datasets/${row.id}/shoreline`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      
      // 创建下载链接
      const blob = new Blob([res.data], { type: "application/geo+json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${row.name || "coastline"}-${row.regionName}.geojson`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      ElMessage.success("下载成功");
    } catch (e) {
      ElMessage.error("下载失败");
    }
    return;
  }
  
  // 尝试通过API下载
  try {
    const res = await api.get(`/api/datasets/${row.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });
    
    const blob = new Blob([res.data]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${row.name || "coastline"}.rar`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    ElMessage.success("下载成功");
  } catch (e) {
    ElMessage.error("下载失败");
  }
}

// 删除数据集
async function handleDelete(row: Dataset) {
  try {
    await ElMessageBox.confirm(
      `确定要删除数据集"${row.name}"吗？删除后将无法恢复。`,
      "确认删除",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
  } catch {
    return; // 用户取消
  }
  
  try {
    await api.delete(`/api/datasets/${row.id}`);
    ElMessage.success("删除成功");
    // 从列表中移除
    datasets.value = datasets.value.filter(d => d.id !== row.id);
    // 如果删除的是当前选中的，重置选择
    if (selected.value?.id === row.id) {
      selected.value = null;
      shorelineLayer?.removeAll();
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "删除失败");
  }
}

// 在新窗口中打开多期对比
function handleOpenInNewWindow(row: Dataset) {
  // 查找同区域的所有数据集
  const sameRegionDatasets = datasets.value.filter(d => d.regionName === row.regionName);
  if (sameRegionDatasets.length <= 1) {
    ElMessage.warning("该区域没有多期数据可比");
    return;
  }
  
  // 按时间排序
  const sorted = [...sameRegionDatasets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // 传递token到新窗口（解决跨窗口localStorage不共享问题）
  const token = localStorage.getItem("coastline.token");
  const datasetIds = sorted.map(d => d.id).join(",");
  const url = token 
    ? `/comparison?ids=${datasetIds}&token=${token}` 
    : `/comparison?ids=${datasetIds}`;
  window.open(url, "_blank", "width=1200,height=800");
}

// 导出当前视图为图片（带比例尺和图例，600DPI）
async function exportMapWithScale() {
  if (!view || !selected.value) {
    ElMessage.warning("请先选择数据集并加载海岸线");
    return;
  }
  try {
    // 使用ArcGIS的截图功能
    const screenshot = await view.takeScreenshot();
    
    if (!screenshot.data) {
      ElMessage.error("截图失败");
      return;
    }
    
    // 获取当前屏幕尺寸，计算600DPI的高分辨率尺寸
    // 假设屏幕是96DPI，600DPI需要放大倍数
    const scaleFactor = 600 / 96;  // 约6.25倍
    const baseW = view.width;
    const baseH = view.height;
    const w = Math.round(baseW * scaleFactor);
    const h = Math.round(baseH * scaleFactor);
    
    // 创建一个canvas添加比例尺和图例
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      ElMessage.error("画布创建失败");
      return;
    }
    
    // 直接绘制base64图片数据
    const img = new Image();
    const dataUrl = "data:image/png;base64," + screenshot.data;
    img.src = dataUrl;
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        // 使用平滑插值放大图片
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        
        // 比例尺和图例不随DPI放大，保持正常大小
        const scale = 1;
        
        // 添加美化图例 - 右下角
        const legendW = 180;
        const legendH = 110;
        const legendX = w - legendW - 15;
        const legendY = h - legendH - 15;
        
        // 图例背景 - 带圆角效果的半透明黑底
        ctx.fillStyle = "rgba(20, 25, 35, 0.85)";
        ctx.beginPath();
        ctx.roundRect(legendX, legendY, legendW, legendH, 8 * scale);
        ctx.fill();
        
        // 图例边框
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
        
        // 图例标题
        const ds = selected.value!;
        const name = ds.name?.substring(0, 24) || "海岸线";
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${14 * scale}px "Microsoft YaHei", Arial, sans-serif`;
        ctx.fillText(name, legendX + 12 * scale, legendY + 24 * scale);
        
        // 分隔线
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.moveTo(legendX + 10 * scale, legendY + 36 * scale);
        ctx.lineTo(legendX + legendW - 10 * scale, legendY + 36 * scale);
        ctx.stroke();
        
        // 图例内容
        ctx.font = `${12 * scale}px "Microsoft YaHei", Arial, sans-serif`;
        const lineHeight = 20 * scale;
        let yPos = legendY + 54 * scale;
        
        ctx.fillStyle = "rgba(0, 112, 255, 0.9)";
        ctx.fillRect(legendX + 12 * scale, yPos - 10 * scale, 16 * scale, 3 * scale);
        ctx.fillStyle = "#e0e0e0";
        ctx.fillText(`区域: ${ds.regionName}`, legendX + 34 * scale, yPos);
        
        yPos += lineHeight;
        ctx.fillStyle = "#e0e0e0";
        ctx.fillText(`时间: ${formatDate(ds.date)}`, legendX + 34 * scale, yPos);
        
        yPos += lineHeight;
        ctx.fillStyle = "#e0e0e0";
        ctx.fillText(`数据类型: ${ds.dataType === "shoreline" ? "海岸线" : "参考"}`, legendX + 34 * scale, yPos);
        
        // 添加比例尺 - 左下角
        const scaleW = 120;
        const scaleH = 32;
        const scaleX = 15;
        const scaleY = h - scaleH - 15;
        
        // 比例尺背景
        ctx.fillStyle = "rgba(20, 25, 35, 0.8)";
        ctx.beginPath();
        ctx.roundRect(scaleX, scaleY, scaleW, scaleH, 4);
        ctx.fill();
        
        // 比例尺刻度
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(scaleX + 12, scaleY + 8);
        ctx.lineTo(scaleX + 12, scaleY + 24);
        ctx.lineTo(scaleX + scaleW - 8, scaleY + 24);
        ctx.lineTo(scaleX + scaleW - 8, scaleY + 8);
        ctx.stroke();
        
        // 比例尺文字
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px Arial";
        ctx.fillText("~5 km", scaleX + 40, scaleY + 19);
        
        resolve();
      };
      img.onerror = () => reject(new Error("图片加载失败"));
    });
    
    // 下载
    const ds = selected.value!;
    const link = document.createElement("a");
    link.download = `coastline-${ds.regionName}-${formatDate(ds.date)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    ElMessage.success("地图导出成功（600DPI）");
  } catch (e: any) {
    console.error("Export error:", e);
    ElMessage.error("导出失败: " + (e?.message || ""));
  }
}

async function applyBasemap(nextBasemapId?: string) {
  if (!view) return;
  const m = view.map;
  if (!m) return;
  const targetBasemapId = nextBasemapId ?? basemapId.value;

  try {
    m.basemap = targetBasemapId as any;
    await m.basemap?.load();
  } catch {
    if (targetBasemapId === "osm") {
      ElMessage.error("底图加载失败");
      return;
    }

    basemapId.value = "osm";
    m.basemap = "osm" as any;
    await m.basemap?.load();
    ElMessage.warning("当前底图不可用，已自动切换到 OpenStreetMap");
  }
}

async function loadGlobalCoastline() {
  if (!globalLayer) return;
  try {
    const res = await api.get("/api/datasets", { params: { regionName: "Global", dataType: "reference" } });
    globalRefDatasets.value = (res.data.datasets ?? []).sort(
      (a: Dataset, b: Dataset) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (!selectedGlobalDatasetId.value && globalRefDatasets.value.length > 0) {
      selectedGlobalDatasetId.value = globalRefDatasets.value[0].id;
    }
    const d = globalRefDatasets.value.find((it) => it.id === selectedGlobalDatasetId.value) ?? globalRefDatasets.value[0];
    if (!d?.id) return;
    const gj = await api.get(`/api/datasets/${d.id}/shoreline`);
    const fc = gj.data.geojson;
    globalLayer.removeAll();
    for (const f of fc.features ?? []) {
      if (!f?.geometry) continue;
      if (f.geometry.type !== "LineString" && f.geometry.type !== "MultiLineString") continue;
      const paths = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
      const geom = new Polyline({ paths, spatialReference: { wkid: 4326 } });
      const geomInView = toViewSRIfNeeded(geom) as any;
      globalLayer.add(
        new Graphic({
          geometry: geomInView,
          symbol: { type: "simple-line", color: [120, 120, 120, 0.55], width: 1 } as any,
          attributes: { title: d.name, method: d.method },
          popupTemplate: { title: "{title}", content: "<div>{method}</div><div style='opacity:.8'>全球参考海岸线</div>" },
        }),
      );
    }
  } catch {
    // ignore
  }
}

function toggleGlobalLayer() {
  if (!globalLayer) return;
  globalLayer.visible = showGlobalCoastline.value;
}

let chinaGshhgLayer: GraphicsLayer | null = null;
async function toggleChinaGshhg() {
  if (!view) return;
  const m = view.map;
  if (!m) return;

  if (!chinaGshhgLayer) {
    chinaGshhgLayer = new GraphicsLayer({ id: "china-gshhg", visible: false });
    m.add(chinaGshhgLayer);
  }

  if (!showChinaGshhg.value) {
    chinaGshhgLayer.visible = false;
    return;
  }

  try {
    const res = await api.get("/api/datasets", { params: { regionName: "China", dataType: "reference" } });
    const d = res.data.datasets?.[0];
    if (!d?.id) {
      ElMessage.warning("未找到 China 的参考海岸线数据集，请先运行 backend 的 seed");
      showChinaGshhg.value = false;
      return;
    }

    const gj = await api.get(`/api/datasets/${d.id}/shoreline`);
    const fc = gj.data.geojson;
    chinaGshhgLayer.removeAll();

    for (const f of fc.features ?? []) {
      if (!f?.geometry) continue;
      if (f.geometry.type !== "LineString" && f.geometry.type !== "MultiLineString") continue;
      const paths = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
      const geom = new Polyline({ paths, spatialReference: { wkid: 4326 } });
      const geomInView = toViewSRIfNeeded(geom) as any;
      chinaGshhgLayer.add(
        new Graphic({
          geometry: geomInView,
          symbol: { type: "simple-line", color: [0, 210, 255, 0.95], width: 1.2 } as any,
          attributes: { title: "China coastline (GSHHG)" },
        }),
      );
    }

    chinaGshhgLayer.visible = true;
    ElMessage.success("GSHHG 中国海岸线已加载");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? e?.message ?? "GSHHG 海岸线加载失败");
    showChinaGshhg.value = false;
    chinaGshhgLayer.visible = false;
  }
}

async function loadComments() {
  if (!selected.value) return;
  commentsLoading.value = true;
  try {
    const res = await api.get(`/api/comments/dataset/${selected.value.id}`);
    comments.value = res.data.comments || [];
  } catch (e: any) {
    // 403 或其他错误时静默处理，不影响用户正常使用
    comments.value = [];
  } finally {
    commentsLoading.value = false;
  }
}

async function postComment() {
  if (!selected.value) return;
  const text = newComment.value.trim();
  if (!text) return;
  try {
    const data: any = { datasetId: selected.value.id, text };
    if (replyTo.value) {
      data.replyToId = replyTo.value.id;
    }
    await api.post("/api/comments", data);
    newComment.value = "";
    cancelReply();
    await loadComments();
    ElMessage.success(replyTo.value ? "已回复" : "已发送");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "发送失败");
  }
}

// 检查是否可以删除评论（自己的评论或管理员）
function canDeleteComment(comment: { userId?: string; username?: string }): boolean {
  const currentUser = auth.user;
  if (!currentUser) return false;
  // 管理员可以删除，或者评论作者可以删除
  if (currentUser.role === "admin") return true;
  if (comment.userId && comment.userId === currentUser.id) return true;
  if (comment.username && comment.username === currentUser.username) return true;
  return false;
}

// 根据用户名生成头像颜色
function getAvatarStyle(username?: string): string {
  if (!username) return "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  // 基于用户名生成一致的哈希颜色
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `background: linear-gradient(135deg, hsl(${hue}, 70%, 60%) 0%, hsl(${(hue + 40) % 360}, 70%, 50%) 100%)`;
}

// 开始回复
function startReply(comment: any, replyToComment?: any) {
  if (replyToComment) {
    replyTo.value = { id: replyToComment.id, username: replyToComment.username };
  } else {
    replyTo.value = { id: comment.id, username: comment.username };
  }
}

// 取消回复
function cancelReply() {
  replyTo.value = null;
}

// 删除评论
async function deleteComment(commentId: string) {
  try {
    await api.delete(`/api/comments/${commentId}`);
    await loadComments();
    ElMessage.success("已删除");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "删除失败");
  }
}

async function doSearch() {
  const q = searchQ.value.trim();
  if (!q) return;
  searchLoading.value = true;
  try {
    const res = await api.get("/api/external/arcgis-search", { params: { q, num: 10, start: 1 } });
    searchResults.value = res.data.results ?? [];
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "检索失败");
  } finally {
    searchLoading.value = false;
  }
}

async function loadStations() {
  if (!stationLayer) return;
  try {
    const res = await api.get("/api/stations");
    stations.value = res.data.stations ?? [];

    stationRegions.value = [...new Set(stations.value.map((s) => s.regionName))].sort((a, b) => a.localeCompare(b));
    filteredStations.value = stationRegion.value
      ? stations.value.filter((s) => s.regionName === stationRegion.value)
      : stations.value;

    stationLayer.removeAll();
    for (const s of filteredStations.value) {
      const [lon, lat] = s.location.coordinates ?? [];
      if (typeof lon !== "number" || typeof lat !== "number") continue;
      const geom = new Point({ x: lon, y: lat, spatialReference: { wkid: 4326 } });
      const geomInView = toViewSRIfNeeded(geom) as any;
      stationLayer.add(
        new Graphic({
          geometry: geomInView,
          symbol: {
            type: "simple-marker",
            style: "circle",
            color: [0, 153, 102, 0.95],
            size: 8,
            outline: { color: [255, 255, 255, 1], width: 1 },
          } as any,
          attributes: { stationId: s.id, name: s.name },
          popupTemplate: { title: "{name}", content: "点击可在右侧查看历史监测数据" },
        }),
      );
    }
    if (filteredStations.value.length === 0) {
      ElMessage.warning("没有加载到站点数据（可能被筛选条件过滤或数据库为空）");
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? e?.message ?? "加载站点失败");
  }
}

// when region changes, refresh layer/table quickly
function onStationRegionChange() {
  filteredStations.value = stationRegion.value
    ? stations.value.filter((s) => s.regionName === stationRegion.value)
    : stations.value;
  // redraw points for current filter
  if (!stationLayer) return;
  stationLayer.removeAll();
  for (const s of filteredStations.value) {
    const [lon, lat] = s.location.coordinates ?? [];
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    const geom = new Point({ x: lon, y: lat, spatialReference: { wkid: 4326 } });
    const geomInView = toViewSRIfNeeded(geom) as any;
    stationLayer.add(
      new Graphic({
        geometry: geomInView,
        symbol: {
          type: "simple-marker",
          style: "circle",
          color: [0, 153, 102, 0.95],
          size: 8,
          outline: { color: [255, 255, 255, 1], width: 1 },
        } as any,
        attributes: { stationId: s.id, name: s.name },
        popupTemplate: { title: "{name}", content: "点击可在右侧查看历史监测数据" },
      }),
    );
  }

  // zoom-to is tricky for a single point (extent ~ 0) -> can cause world zoom.
  if (!view || !stationRegion.value) return;
  const items = stationLayer.graphics?.toArray() ?? [];
  if (items.length === 1 && items[0]?.geometry) {
    view.goTo({ target: items[0].geometry, zoom: 10 }, { duration: 350 }).catch(() => undefined);
    return;
  }
  if (stationLayer.fullExtent) {
    view.goTo(stationLayer.fullExtent.expand(1.6), { duration: 350 }).catch(() => undefined);
  }
}

async function onSelectStation(row: any) {
  if (!row) return;
  selectedStation.value = { id: row.id, name: row.name, regionName: row.regionName };
  // fly to the station at a reasonable city-scale zoom
  if (view && row?.location?.coordinates?.length === 2) {
    const [lon, lat] = row.location.coordinates;
    if (typeof lon === "number" && typeof lat === "number") {
      const p = toViewSRIfNeeded(new Point({ x: lon, y: lat, spatialReference: { wkid: 4326 } })) as any;
      view.goTo({ target: p, zoom: 12 }, { duration: 350 }).catch(() => undefined);
    }
  }
  await loadRealtime();
  startRealtimeTimer();
  await loadStationObs();
}

function startRealtimeTimer() {
  stopRealtimeTimer();
  realtimeTimer = setInterval(() => {
    loadRealtime();
  }, 5000);
}

function stopRealtimeTimer() {
  if (realtimeTimer) {
    clearInterval(realtimeTimer);
    realtimeTimer = null;
  }
}

async function loadRealtime() {
  if (!selectedStation.value) return;
  realtimeLoading.value = true;
  try {
    const res = await api.get(`/api/stations/${selectedStation.value.id}/realtime`);
    const rt = res.data.realtime;
    realtime.at = rt?.at ?? null;
    realtime.sst = typeof rt?.sst === "number" ? rt.sst : null;
    realtime.salinity = typeof rt?.salinity === "number" ? rt.salinity : null;
    realtime.turbidity = typeof rt?.turbidity === "number" ? rt.turbidity : null;
    realtime.chlorophyll = typeof rt?.chlorophyll === "number" ? rt.chlorophyll : null;
    realtime.dissolvedOxygen = typeof rt?.dissolvedOxygen === "number" ? rt.dissolvedOxygen : null;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? e?.message ?? "加载实时监测失败");
  } finally {
    realtimeLoading.value = false;
  }
}

async function loadStationObs() {
  if (!selectedStation.value) return;
  try {
    const res = await api.get(`/api/stations/${selectedStation.value.id}/observations`, { params: { limit: 60 } });
    stationObs.value = res.data.observations ?? [];
    renderChart();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "加载监测数据失败");
  }
}

function renderChart() {
  if (!chartEl.value) return;
  if (!chart) chart = echarts.init(chartEl.value);
  const xs = stationObs.value.map((o) => formatDate(o.at));
  const sst = stationObs.value.map((o) => Number(o.sst.toFixed(2)));
  const sal = stationObs.value.map((o) => Number(o.salinity.toFixed(2)));
  const tur = stationObs.value.map((o) => Number(o.turbidity.toFixed(2)));
  const chl = stationObs.value.map((o) => Number(o.chlorophyll.toFixed(2)));
  const oxygen = stationObs.value.map((o) => Number(o.dissolvedOxygen.toFixed(2)));

  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["SST", "盐度", "浊度", "叶绿素", "溶解氧"] },
    grid: { left: 40, right: 18, top: 28, bottom: 28 },
    xAxis: { type: "category", data: xs, axisLabel: { hideOverlap: true } },
    yAxis: [{ type: "value" }, { type: "value" }],
    series: [
      { name: "SST", type: "line", data: sst, smooth: true },
      { name: "盐度", type: "line", data: sal, smooth: true },
      { name: "浊度", type: "line", data: tur, smooth: true },
      { name: "叶绿素", type: "line", data: chl, smooth: true },
      { name: "溶解氧", type: "line", yAxisIndex: 1, data: oxygen, smooth: true },
    ],
  });
}

function updateAnalysisMetrics() {
  if (!analysisGeometry) {
    analysis.hasGeometry = false;
    analysis.geometryType = "-";
    analysis.lengthMeters = null;
    analysis.areaSqm = null;
    return;
  }
  analysis.hasGeometry = true;
  analysis.geometryType = (analysisGeometry as any).type ?? "geometry";

  const geo = toGeographicIfNeeded(analysisGeometry);
  const t = (geo as any).type;

  if (t === "polyline") {
    analysis.lengthMeters = geometryEngine.geodesicLength(geo as any, "meters");
    analysis.areaSqm = null;
  } else if (t === "polygon" || t === "extent") {
    analysis.areaSqm = Math.abs(geometryEngine.geodesicArea(geo as any, "square-meters"));
    analysis.lengthMeters = null;
  } else {
    analysis.lengthMeters = null;
    analysis.areaSqm = null;
  }
}

function getAnalysisQueryGeometry() {
  if (!analysisGeometry) return null;
  if (analysis.bufferEnabled && analysis.bufferMeters > 0) {
    const geo = toGeographicIfNeeded(analysisGeometry);
    const buffered = geometryEngine.geodesicBuffer(geo as any, analysis.bufferMeters, "meters") as any;
    return toViewSRIfNeeded(buffered);
  }
  return analysisGeometry;
}

function applyAnalysisOverlay() {
  if (!analysisOverlayLayer) return;
  analysisOverlayLayer.removeAll();
  if (!analysisGeometry) return;

  const qGeom = getAnalysisQueryGeometry();
  if (!qGeom) return;
  if (analysis.bufferEnabled && analysis.bufferMeters > 0) {
    analysisOverlayLayer.add(
      new Graphic({
        geometry: qGeom as any,
        symbol: {
          type: "simple-fill",
          color: [255, 204, 0, 0.08],
          outline: { color: [255, 204, 0, 0.8], width: 2 },
        } as any,
        attributes: { title: "buffer" },
      }),
    );
  }
}

function clearAnalysis() {
  analysisDrawLayer?.removeAll();
  analysisOverlayLayer?.removeAll();
  analysisResultLayer?.removeAll();
  analysis.matches = [];
  analysis.selectedMatchId = null;
  analysisGeometry = null;
  updateAnalysisMetrics();
}

function runSpatialFilter() {
  if (!shorelineLayer || !analysisResultLayer) return;
  if (!analysisGeometry) {
    ElMessage.warning("请先在地图上绘制几何");
    return;
  }
  if (!selected.value) {
    ElMessage.warning("请先加载一个数据集海岸线");
    return;
  }

  const qGeom = getAnalysisQueryGeometry();
  if (!qGeom) return;

  analysisResultLayer.removeAll();
  analysis.matches = [];
  analysis.selectedMatchId = null;

  const graphicsArr = shorelineLayer.graphics?.toArray() ?? [];
  for (const g of graphicsArr) {
    if (!g.geometry) continue;
    let ok = false;
    try {
      ok = geometryEngine.intersects(g.geometry as any, qGeom as any);
    } catch {
      ok = false;
    }
    if (!ok) continue;

    const hg = new Graphic({
      geometry: g.geometry,
      symbol: { type: "simple-line", color: [255, 204, 0, 0.95], width: 4 } as any,
      attributes: g.attributes,
    });
    analysisResultLayer.add(hg);

    const id = String(g.attributes?.OBJECTID ?? Math.random().toString(36).slice(2));
    analysis.matches.push({
      id,
      datasetName: String(g.attributes?.datasetName ?? ""),
      sensor: String(g.attributes?.sensor ?? ""),
      date: String(g.attributes?.date ?? ""),
      graphic: g,
    });
  }

  if (analysis.matches.length === 0) ElMessage.info("未找到相交的海岸线要素");
}

async function onSelectMatch(row: any) {
  if (!row?.graphic || !view) return;
  analysis.selectedMatchId = row.id ?? null;
  try {
    await view.goTo(row.graphic.geometry, { duration: 350 });
    if (view.popup) {
      view.popup.open({ features: [row.graphic] as any, location: view.center });
    }
  } catch {
    // ignore
  }
}

async function getDatasetLengthMeters(datasetId: string) {
  const res = await api.get(`/api/datasets/${datasetId}/shoreline`);
  const fc = res.data.geojson;
  let total = 0;
  for (const f of fc?.features ?? []) {
    if (!f?.geometry) continue;
    if (f.geometry.type !== "LineString" && f.geometry.type !== "MultiLineString") continue;
    const paths = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
    const g = new Polyline({ paths, spatialReference: { wkid: 4326 } });
    total += geometryEngine.geodesicLength(g as any, "meters") || 0;
  }
  return total;
}

async function runChangeAnalysis() {
  if (!changeAnalysis.fromDatasetId || !changeAnalysis.toDatasetId) {
    ElMessage.warning("请选择基准期和对比期数据集");
    return;
  }
  if (changeAnalysis.fromDatasetId === changeAnalysis.toDatasetId) {
    ElMessage.warning("基准期与对比期不能相同");
    return;
  }
  changeAnalysis.loading = true;
  try {
    const [fromLengthMeters, toLengthMeters] = await Promise.all([
      getDatasetLengthMeters(changeAnalysis.fromDatasetId),
      getDatasetLengthMeters(changeAnalysis.toDatasetId),
    ]);
    const deltaMeters = toLengthMeters - fromLengthMeters;
    const deltaPct = fromLengthMeters > 0 ? (deltaMeters / fromLengthMeters) * 100 : 0;
    changeAnalysis.result = { fromLengthMeters, toLengthMeters, deltaMeters, deltaPct };
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "海岸线变迁分析失败");
  } finally {
    changeAnalysis.loading = false;
  }
}

onMounted(async () => {
  initUserInfo();
  updateClockText();
  clockTimer = setInterval(updateClockText, 1000);
  initLocationAndWeather();

  // 监听筛选条件变化，自动刷新表格
  watch(
    () => [filters.regionName, filters.sensor, filters.dataType],
    () => {
      loadDatasets();
    },
    { deep: true },
  );

  const map = new Map({ basemap: "osm" });
  globalLayer = new GraphicsLayer({ id: "global-coast", visible: true });
  shorelineLayer = new GraphicsLayer({ id: "shorelines" });
  stationLayer = new GraphicsLayer({ id: "stations" });
  analysisDrawLayer = new GraphicsLayer({ id: "analysis-draw" });
  analysisOverlayLayer = new GraphicsLayer({ id: "analysis-overlay" });
  analysisResultLayer = new GraphicsLayer({ id: "analysis-results" });
  animationLayer = new GraphicsLayer({ id: "animation" });
  map.addMany([globalLayer, shorelineLayer, analysisResultLayer, analysisOverlayLayer, stationLayer, analysisDrawLayer, animationLayer]);

  view = new MapView({
    container: mapEl.value as HTMLDivElement,
    map,
    center: XIAMEN_CENTER,
    zoom: XIAMEN_ZOOM,
  });

  // 添加比例尺
  const scaleBar = new ScaleBar({
    view: view,
    unit: "metric",
    style: "line",
    visible: true,
  });
  view.ui.add(scaleBar, {
    position: "bottom-left",
    margin: { x: 10, y: 10 },
  });

  // 添加罗盘（导航指南针）
  const compass = new Compass({
    view: view,
    visible: true,
  });
  view.ui.add(compass, {
    position: "top-right",
    margin: { x: 10, y: 10 },
  });

  // 监听鼠标移动，显示经纬度
  const coordDiv = document.createElement("div");
  coordDiv.className = "coord-display";
  coordDiv.style.cssText = "background:rgba(0,0,0,0.7);color:#fff;padding:4px 8px;border-radius:3px;font-size:12px;";
  view.ui.add(coordDiv, { position: "bottom-right", index: 0 });
  view.on("pointer-move", (event) => {
    if (!view) return;
    const point = view.toMap({ x: event.x, y: event.y });
    if (point) {
      const lng = point.longitude?.toFixed(4) ?? "-";
      const lat = point.latitude?.toFixed(4) ?? "-";
      coordDiv.textContent = `经度: ${lng}°  纬度: ${lat}°`;
    }
  });

  await applyBasemap("osm");
  await loadDatasets();
  await autoSelectFirstDataset();
  await loadGlobalCoastline();
  await loadStations();
  // await runSuitabilityAnalysis(); // TODO: 未实现
  // default: show all provinces; you can filter in UI
  stationRegion.value = null;

  // Sketch widget - 放在面板内的容器中
  sketch = new Sketch({
    view,
    layer: analysisDrawLayer as any,
    container: sketchEl.value as any,
    availableCreateTools: ["point", "polyline", "polygon", "rectangle", "circle"],
    creationMode: "update",
    visibleElements: {
      selectionTools: false,
      settingsMenu: false,
      undoRedoMenu: true,
    } as any,
  });

  const syncFromGraphic = (graphic: any) => {
    analysisGeometry = graphic?.geometry ?? null;
    updateAnalysisMetrics();
    applyAnalysisOverlay();
  };

  sketch.on("create", (e: any) => {
    if (e.state === "complete") {
      syncFromGraphic(e.graphic);
    }
  });
  sketch.on("update", (e: any) => {
    if (e.state === "complete") syncFromGraphic(e.graphics?.[0]);
  });

  view.on("click", async (ev) => {
    const hit = await view!.hitTest(ev);
    const g = (hit.results as any[]).find((r) => r?.graphic?.layer?.id === "stations")?.graphic;
    const stationId = g?.attributes?.stationId as string | undefined;
    if (stationId) {
      const found = stations.value.find((s) => s.id === stationId);
      if (found) {
        await onSelectStation(found);
        activeTab.value = "stations";
      }
    }
  });
});

onUnmounted(() => {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
  stopRealtimeTimer();
  pauseAnimation();
  sketch?.destroy?.();
  sketch = null;
  view?.destroy();
  view = null;
  shorelineLayer = null;
  globalLayer = null;
  stationLayer = null;
  analysisDrawLayer = null;
  analysisOverlayLayer = null;
  analysisResultLayer = null;
  animationLayer = null;
  chinaGshhgLayer = null;
  chart?.dispose?.();
  chart = null;
});
</script>

<style scoped>
.realtime-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
  margin-top: 8px;
  line-height: 1.6;
}

.metric-card {
  min-width: 0;
}

.station-table-wrap {
  overflow-x: auto;
  padding-bottom: 2px;
}

/* 侧边栏调整宽度的样式 */
.panel {
  transition: width 0.1s ease-out;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.resize-handle {
  width: 8px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  transition: background 0.2s;
  flex-shrink: 0;
  z-index: 10;
}

.comment-avatar {
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: bold;
}

.comment-avatar-large {
  flex-shrink: 0;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  font-weight: bold;
}

.comment-list {
  max-height: 400px;
  overflow-y: auto;
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-username {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.comment-text {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  word-wrap: break-word;
}

.comment-actions {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}

.reply-btn, .delete-btn {
  font-size: 12px;
  color: #999;
  cursor: pointer;
  transition: color 0.2s;
}

.reply-btn:hover {
  color: #f5576c;
}

.delete-btn:hover {
  color: #ff4d4f;
}

.reply-list {
  margin-top: 10px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 8px;
}

.reply-item {
  padding: 6px 0;
  font-size: 13px;
  line-height: 1.5;
}

.reply-username {
  font-weight: 500;
  color: #333;
  margin-right: 4px;
}

.reply-to {
  color: #999;
  margin-right: 4px;
}

.reply-text {
  color: #666;
}

.reply-actions {
  display: inline-flex;
  gap: 8px;
  margin-left: 8px;
}

/* B站风格筛选标签 */
.filter-tag {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 2px;
  background: #f4f5f7;
  color: #61666d;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.filter-tag:hover {
  background: #e3e5e7;
  color: #18191c;
}

.filter-tag.active {
  background: #00a1d6;
  color: #fff;
  border-color: #00a1d6;
}
</style>

