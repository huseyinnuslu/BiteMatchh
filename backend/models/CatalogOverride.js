import mongoose from 'mongoose';

const catalogOverrideSchema = new mongoose.Schema({
  category: { type: String, enum: ['mekan', 'film', 'aktivite'], required: true },
  sourceName: { type: String, required: true },
  changes: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

catalogOverrideSchema.index({ category: 1, sourceName: 1 }, { unique: true });

export default mongoose.model('CatalogOverride', catalogOverrideSchema);
