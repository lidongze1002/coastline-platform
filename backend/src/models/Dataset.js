import mongoose from "mongoose";

const DatasetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // 所属文件夹
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    // 分组名称（如：东海区大陆海岸线），用于将同一区域不同年份的数据分组
    groupName: { type: String, default: "" },
    sensor: { type: String, required: true, enum: ["sentinel2", "landsat8", "landsat9", "mixed"] },
    date: { type: Date, required: true },
    regionName: { type: String, required: true },
    method: { type: String, default: "" },
    status: { type: String, required: true, enum: ["draft", "pending", "published"], default: "draft" },

    dataType: { type: String, required: true, enum: ["shoreline", "reference"], default: "shoreline" },
    // 海岸线类型：natural-自然岸线, artificial-人工岸线, unknown-普通/未分类
    coastlineType: { type: String, enum: ["natural", "artificial", "unknown"], default: "unknown" },
    // 详细的海岸线子类型（如基岩岸线、砂砾质岸线、淤泥质岸线、养殖岸线、港口码头岸线等）
    coastlineSubtype: { type: String, default: "" },
    // 原数据文件路径（用于下载原始压缩包）
    originalDataPath: { type: String, default: "" },
    // 原始文件详情（文件名、大小、上传时间等）
    originalFile: {
      fileName: { type: String, default: "" },
      filePath: { type: String, default: "" },
      fileSize: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
    },
    // 备注
    description: { type: String, default: "" },
    
    shorelineGeojson: { type: mongoose.Schema.Types.Mixed, default: null },
    // 外部GeoJSON文件路径（用于大文件）
    shorelineFilePath: { type: String, default: null },
    // 审核拒绝原因
    rejectReason: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

DatasetSchema.index({ sensor: 1, date: -1 });
DatasetSchema.index({ regionName: 1, date: -1 });
DatasetSchema.index({ date: 1 }); // 用于时间范围筛选
DatasetSchema.index({ groupName: 1, date: -1 }); // 用于分组查询
DatasetSchema.index({ folderId: 1 });

export const Dataset = mongoose.model("Dataset", DatasetSchema);

