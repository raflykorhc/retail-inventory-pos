
import prisma from "../config/db.ts";
import { ApiError } from "../utils/ApiError.ts";

export class ProductService {
  static async getAll(page?: number, limit?: number, search?: string, categoryId?: string, supplierId?: string, sort?: string, abcCategory?: string, stockStatus?: string) {
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } }
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;
    if (abcCategory && abcCategory !== "ALL") {
      if (abcCategory === "NONE") {
        where.abcCategory = null;
      } else {
        where.abcCategory = abcCategory;
      }
    }
    if (stockStatus) {
      if (stockStatus === "out_of_stock") {
        where.stock = { lte: 0 };
      } else if (stockStatus === "in_stock") {
        where.stock = { gt: 0 };
      } else if (stockStatus === "reorder" || stockStatus === "low_stock") {
        where.stock = { lte: prisma.product.fields.minStock };
      }
    }

    let primaryOrderBy: any = { name: "asc" }; // default
    if (sort) {
      switch (sort) {
        case 'name_asc': primaryOrderBy = { name: "asc" }; break;
        case 'name_desc': primaryOrderBy = { name: "desc" }; break;
        case 'stock_desc': primaryOrderBy = { stock: "desc" }; break;
        case 'stock_asc': primaryOrderBy = { stock: "asc" }; break;
        case 'popular': primaryOrderBy = { saleItems: { _count: "desc" } }; break;
      }
    }
    const orderBy = [primaryOrderBy, { id: "asc" }];

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: true,
            supplier: true,
            prices: { include: { unit: true }, orderBy: { conversionFactor: "desc" } },
            stockBatches: { 
              where: { currentQuantity: { gt: 0 }, isArchived: false }, 
              orderBy: { createdAt: "desc" }, 
              include: { batchPrices: true },
              take: 5 
            },
            stockLogs: { take: 5, orderBy: { createdAt: "desc" } }, // Limit logs for performance
            productImage: { select: { id: true } }
          },
          skip,
          take: limit,
          orderBy
        }),
        prisma.product.count({ where })
      ]);
      return { items, total, page, limit };
    }

    return await prisma.product.findMany({
      where,
      include: {
        category: true,
        supplier: true,
        prices: { include: { unit: true }, orderBy: { conversionFactor: "desc" } },
        stockBatches: { 
          where: { currentQuantity: { gt: 0 }, isArchived: false }, 
          orderBy: { createdAt: "desc" }, 
          include: { batchPrices: true },
          take: 5 
        },
        stockLogs: { take: 10, orderBy: { createdAt: "desc" } },
        productImage: { select: { id: true } }
      },
      orderBy
    });
  }

  static async bulkDelete(ids: string[], userId?: string) {
    if (!ids || ids.length === 0) return { success: true, count: 0 };

    return await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: ids } }
      });

      const result = await tx.product.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: new Date() }
      });

      if (userId && products.length > 0) {
        const { AuditService } = await import("./AuditService.ts");
        for (const p of products) {
          await AuditService.log({
            userId,
            action: "DELETE_PRODUCT",
            entity: "Product",
            entityId: p.id,
            details: { name: p.name, code: p.code, note: "Bulk Soft Delete" }
          });
        }
      }

      return { success: true, count: result.count };
    });
  }

  static async create(data: {
    code?: string;
    name: string;
    description?: string;
    categoryId: string;
    supplierId?: string;
    unitId: string;
    price: number;
    initialStock: number;
    image?: string;
    minStock?: number;
    averageCost?: number;
    initialCost?: number;
    leadTime?: number;
    maxStock?: number;
  }, userId?: string) {
    const sanitizeId = (id: any) => {
      if (!id || typeof id !== "string" || id.trim() === "" || id === "undefined" || id === "null") return null;
      return id.trim();
    };

    const categoryId = sanitizeId(data.categoryId);
    const supplierId = sanitizeId(data.supplierId);

    const pricesData = (data as any).prices && Array.isArray((data as any).prices) 
      ? (data as any).prices.map((p: any) => ({
          unitId: p.unitId,
          price: Number(p.price) || 0,
          conversionFactor: Number(p.conversionFactor) || 1
        }))
      : [{
          unitId: sanitizeId(data.unitId) as string,
          price: Number(data.price) || 0,
          conversionFactor: 1
        }];

    if (!data.name || !categoryId || !pricesData[0]?.unitId) {
      throw new ApiError(400, "Nama, kategori, dan satuan wajib diisi");
    }

    let code = data.code;
    if (!code) {
      code = `BRG-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
    }

    const initialUnitFactor = pricesData.find((p: any) => String(p.unitId) === String(sanitizeId(data.unitId)))?.conversionFactor || 1;
    const baseInitialStock = Number(data.initialStock) || 0; // Already in base units from frontend
    const baseMinStock = (Number(data.minStock) || 10) * initialUnitFactor;
    const baseMaxStock = data.maxStock ? Number(data.maxStock) * initialUnitFactor : null;
    const rawCost = Number(data.initialCost) || Number(data.averageCost) || 0;
    const baseInitialCost = rawCost / initialUnitFactor;

    console.log("DEBUG: Creating product with data:", {
      code,
      name: data.name,
      categoryId,
      supplierId,
      pricesCount: pricesData.length,
      initialUnitFactor,
      baseInitialStock
    });

    return await prisma.$transaction(async (tx) => {
      try {

        const product = await tx.product.create({
          data: {
            code,
            name: data.name,
            description: data.description,
            categoryId: categoryId as string,
            supplierId: supplierId,
            stock: baseInitialStock,
            minStock: baseMinStock,
            averageCost: baseInitialCost,
            leadTime: data.leadTime ? Number(data.leadTime) : 3,
            maxStock: baseMaxStock,
            prices: {
              create: pricesData
            }
          }
        });

        if (data.image) {
          let base64String = data.image;
          let mimeType = 'image/jpeg';
          if (base64String.startsWith('data:')) {
            const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              mimeType = matches[1];
              base64String = matches[2];
            }
          }
          await tx.productImage.create({
            data: {
              productId: product.id,
              data: Buffer.from(base64String, 'base64'),
              mimeType: mimeType
            }
          });
        }

        if (baseInitialStock > 0) {
          // Create initial batch for FIFO
          const sortedPrices = [...pricesData].sort((a, b) => b.conversionFactor - a.conversionFactor);
          const mainPriceObj = sortedPrices[0];
          const mainFactor = mainPriceObj?.conversionFactor || 1;
          const basePriceObj = sortedPrices.find(p => p.conversionFactor === 1) || sortedPrices[sortedPrices.length - 1];

          const batch = await tx.stockBatch.create({
            data: {
              productId: product.id,
              initialQuantity: baseInitialStock,
              currentQuantity: baseInitialStock,
              costPrice: baseInitialCost,
              sellingPrice: mainPriceObj ? (Number(mainPriceObj.price) / mainFactor) : (Number(data.price) || 0),
              unitId: basePriceObj?.unitId || sanitizeId(data.unitId),
              conversionFactor: basePriceObj?.conversionFactor || 1
            }
          });

          // Snapshot current prices for this batch
          const currentPrices = await tx.productPrice.findMany({
            where: { productId: product.id }
          });
          if (currentPrices.length > 0) {
            await tx.stockBatchPrice.createMany({
              data: currentPrices.map(p => ({
                batchId: batch.id,
                unitId: p.unitId,
                price: p.price
              }))
            });
          }

          // Log the initial stock
          await tx.stockLog.create({
            data: {
              productId: product.id,
              type: "IN",
              quantity: baseInitialStock,
              reason: "Stok Awal (Input Manual)"
            }
          });
        }

        if (userId) {
          const { AuditService } = await import("./AuditService.ts");
          await AuditService.log({
            userId,
            action: "CREATE_PRODUCT",
            entity: "Product",
            entityId: product.id,
            details: { name: product.name, code: product.code }
          });
        }

        return product;
      } catch (error: any) {
        if (error.code === "P2003") {
          const target = error.meta?.field_name || "Unknown";
          throw new ApiError(400, `Gagal simpan: Data relasi tidak ditemukan. Cek kembali Kategori, Satuan, atau Supplier. (Detail: ${target}, SupplierId: ${supplierId})`);
        }
        throw error;
      }
    });
  }

  static async preflightScaleShift(id: string, pricesData: Array<{ unitId: string; price: number; conversionFactor: number }>) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { prices: { include: { unit: true } } }
    });

    if (!product) {
      throw new ApiError(404, "Produk tidak ditemukan");
    }

    const errors: string[] = [];

    // Guardrail 1: Negative Stock
    if (product.stock < 0) {
      errors.push(`Gagal Ubah Satuan Dasar: Stok barang tersisa di bawah nol (Stok: ${product.stock}). Harap sesuaikan stok sebelum mengubah satuan dasar.`);
    }

    // Guardrail 2: Active Purchase Orders
    const pendingPurchases = await prisma.purchaseItem.findMany({
      where: { productId: id, purchase: { paymentStatus: "PENDING" } }
    });
    if (pendingPurchases.length > 0) {
      errors.push("Gagal Ubah Satuan Dasar: Terdapat transaksi Pembelian (PO) bertipe PENDING yang mengunci barang ini.");
    }

    // Guardrail 3: Active Cart Items
    const activeCartItems = await prisma.cartItem.findMany({
      where: { productId: id }
    });
    if (activeCartItems.length > 0) {
      errors.push("Gagal Ubah Satuan Dasar: Terdapat keranjang belanja POS aktif yang mengunci barang ini.");
    }

    // Calculate scale shift ratio S
    const oldPrices = product.prices;
    const oldBase = oldPrices.find(p => p.conversionFactor === 1) || oldPrices[0];
    const oldBaseInNew = pricesData.find(p => p.unitId === oldBase?.unitId);
    let shift = oldBaseInNew ? Number(oldBaseInNew.conversionFactor) : 1;

    if (!oldBaseInNew) {
      const newBase = pricesData.find(p => Number(p.conversionFactor) === 1) || pricesData[0];
      const newBaseInOld = oldPrices.find(p => p.unitId === newBase?.unitId);
      if (newBaseInOld && newBaseInOld.conversionFactor > 0) {
        shift = 1 / newBaseInOld.conversionFactor;
      }
    }

    if (shift <= 0 || isNaN(shift)) {
      errors.push("Gagal Ubah Satuan Dasar: Rasio konversi pergeseran skala tidak valid (harus > 0).");
    }

    const oldBaseUnitName = oldBase?.unit?.name || "Satuan Lama";
    const newBaseObj = pricesData.find(p => Number(p.conversionFactor) === 1);
    const newUnit = newBaseObj ? await prisma.unit.findUnique({ where: { id: newBaseObj.unitId } }) : null;
    const newBaseUnitName = newUnit?.name || "Satuan Baru";

    const preStock = product.stock;
    const preAvgCost = Number(product.averageCost);
    const preValuation = preStock * preAvgCost;

    const postStock = preStock * shift;
    const postAvgCost = preAvgCost / shift;
    const postValuation = postStock * postAvgCost;
    const valuationDelta = postValuation - preValuation;

    return {
      canShift: errors.length === 0,
      scaleShiftRatio: shift,
      oldBaseUnitName,
      newBaseUnitName,
      preScaling: {
        stock: preStock,
        unit: oldBaseUnitName,
        averageCost: preAvgCost,
        totalValuation: preValuation
      },
      postScaling: {
        stock: postStock,
        unit: newBaseUnitName,
        averageCost: postAvgCost,
        totalValuation: postValuation
      },
      valuationDelta,
      errors
    };
  }

  static async update(id: string, data: any, userId?: string) {
    const sanitizeId = (id: any) => {
      if (!id || typeof id !== "string" || id.trim() === "" || id === "undefined" || id === "null") return null;
      return id.trim();
    };

    const categoryId = sanitizeId(data.categoryId);
    const supplierId = sanitizeId(data.supplierId);
    const unitId = sanitizeId(data.unitId);

    try {
      return await prisma.$transaction(async (tx) => {
        const pricesData = data.prices && Array.isArray(data.prices) ? data.prices : null;

        // --- STABLE BATCH RE-SCALING LOGIC (SAFE MULTI-UNIT SCALE SHIFT ENGINE) ---
        const oldPrices = await tx.productPrice.findMany({ where: { productId: id }, include: { unit: true } });
        const oldBase = oldPrices.find(p => p.conversionFactor === 1) || oldPrices[0];
        
        if (oldBase && pricesData && pricesData.length > 0) {
          const oldBaseInNew = pricesData.find((p: any) => p.unitId === oldBase.unitId);
          let shift = oldBaseInNew ? Number(oldBaseInNew.conversionFactor) : 1;

          if (!oldBaseInNew) {
            const newBase = pricesData.find((p: any) => Number(p.conversionFactor) === 1) || pricesData[0];
            const newBaseInOld = oldPrices.find(p => p.unitId === newBase?.unitId);
            if (newBaseInOld && newBaseInOld.conversionFactor > 0) {
              shift = 1 / newBaseInOld.conversionFactor;
            }
          }

          if (shift !== 1 && !isNaN(shift) && shift > 0) {
            // Guardrail validations inside transaction
            const product = await tx.product.findUnique({ where: { id } });
            if (!product) throw new ApiError(404, "Produk tidak ditemukan");

            if (product.stock < 0) {
              throw new ApiError(400, `Gagal Ubah Satuan Dasar: Stok barang tersisa di bawah nol (Stok: ${product.stock}). Harap sesuaikan stok sebelum mengubah satuan dasar.`);
            }

            const pendingPurchases = await tx.purchaseItem.findMany({
              where: { productId: id, purchase: { paymentStatus: "PENDING" } }
            });
            if (pendingPurchases.length > 0) {
              throw new ApiError(400, "Gagal Ubah Satuan Dasar: Terdapat transaksi Pembelian (PO) bertipe PENDING yang mengunci barang ini.");
            }

            const activeCartItems = await tx.cartItem.findMany({
              where: { productId: id }
            });
            if (activeCartItems.length > 0) {
              throw new ApiError(400, "Gagal Ubah Satuan Dasar: Terdapat keranjang belanja POS aktif yang mengunci barang ini.");
            }

            // 1. Update Product attributes
            const preStock = product.stock;
            const preAvgCost = Number(product.averageCost);
            const preValuation = preStock * preAvgCost;

            const postStock = preStock * shift;
            const postAvgCost = preAvgCost / shift;
            const postValuation = postStock * postAvgCost;

            await tx.product.update({
              where: { id },
              data: { 
                stock: postStock,
                minStock: (product.minStock || 0) * shift,
                maxStock: product.maxStock ? product.maxStock * shift : null,
                averageCost: postAvgCost
              }
            });

            // 2. Rescale StockBatch
            const batches = await tx.stockBatch.findMany({ where: { productId: id } });
            for (const batch of batches) {
              await tx.stockBatch.update({
                where: { id: batch.id },
                data: {
                  initialQuantity: Number(batch.initialQuantity) * shift,
                  currentQuantity: Number(batch.currentQuantity) * shift,
                  costPrice: Number(batch.costPrice) / shift,
                  sellingPrice: Number(batch.sellingPrice) / shift,
                  conversionFactor: (Number(batch.conversionFactor) || 1) * shift
                }
              });
            }

            // 3. Rescale SaleItemBatch
            const saleItemBatches = await tx.saleItemBatch.findMany({
              where: { batch: { productId: id } }
            });
            for (const sib of saleItemBatches) {
              await tx.saleItemBatch.update({
                where: { id: sib.id },
                data: {
                  quantity: sib.quantity * shift,
                  costPrice: Number(sib.costPrice) / shift
                }
              });
            }

            // 4. Rescale SaleItem conversionFactor
            const saleItems = await tx.saleItem.findMany({ where: { productId: id } });
            for (const si of saleItems) {
              await tx.saleItem.update({
                where: { id: si.id },
                data: {
                  conversionFactor: (si.conversionFactor || 1) * shift
                }
              });
            }

            // 5. Rescale unfrozen StockLog
            const unfrozenLogs = await tx.stockLog.findMany({
              where: { productId: id, unitName: null }
            });
            for (const log of unfrozenLogs) {
              await tx.stockLog.update({
                where: { id: log.id },
                data: {
                  quantity: log.quantity * shift
                }
              });
            }

            // 6. Audit Logging
            if (userId) {
              const oldUnitName = oldBase?.unit?.name || "Satuan Lama";
              const newBaseObj = pricesData.find((p: any) => Number(p.conversionFactor) === 1);
              const newUnit = newBaseObj ? await tx.unit.findUnique({ where: { id: newBaseObj.unitId } }) : null;
              const newUnitName = newUnit?.name || "Satuan Baru";

              await tx.auditLogs.create({
                data: {
                  userId,
                  action: "SHIFT_PRODUCT_BASE_UNIT",
                  entity: "Product",
                  entityId: id,
                  details: JSON.stringify({
                    productCode: product.code,
                    productName: product.name,
                    oldBaseUnit: oldUnitName,
                    newBaseUnit: newUnitName,
                    scaleShiftRatio: shift,
                    preScaling: {
                      stock: preStock,
                      unit: oldUnitName,
                      averageCost: preAvgCost,
                      totalValuation: preValuation
                    },
                    postScaling: {
                      stock: postStock,
                      unit: newUnitName,
                      averageCost: postAvgCost,
                      totalValuation: postValuation
                    },
                    valuationDelta: postValuation - preValuation,
                    timestamp: new Date().toISOString()
                  })
                }
              });
            }
          }
        }
        // --- END OF RE-SCALING LOGIC ---
        
        // --- STOCK ADJUSTMENT LOGIC ---
        if (data.stock !== undefined) {
          const productBefore = await tx.product.findUnique({ where: { id } });
          const currentStock = productBefore?.stock || 0;
          const targetStock = Number(data.stock);
          const diff = targetStock - currentStock;

          if (diff !== 0) {
            // Update total stock
            await tx.product.update({
              where: { id },
              data: { stock: targetStock }
            });

            // Log adjustment
            await tx.stockLog.create({
              data: {
                productId: id,
                type: diff > 0 ? "IN" : "OUT",
                quantity: Math.abs(diff),
                reason: "Penyesuaian Stok (Edit Barang)"
              }
            });

            // Adjust batches for consistency
            if (diff > 0) {
              const latestBatch = await tx.stockBatch.findFirst({
                where: { productId: id },
                orderBy: { createdAt: "desc" }
              });

              if (latestBatch) {
                await tx.stockBatch.update({
                  where: { id: latestBatch.id },
                  data: {
                    initialQuantity: latestBatch.initialQuantity + diff,
                    currentQuantity: latestBatch.currentQuantity + diff
                  }
                });
              } else {
                const sortedPrices = await tx.productPrice.findMany({ 
                  where: { productId: id }, 
                  orderBy: { conversionFactor: "desc" } 
                });
                const mainPrice = sortedPrices[0];
                const basePrice = sortedPrices.find(p => p.conversionFactor === 1) || sortedPrices[sortedPrices.length-1];
                
                await tx.stockBatch.create({
                  data: {
                    productId: id,
                    initialQuantity: diff,
                    currentQuantity: diff,
                    costPrice: Number(productBefore?.averageCost) || 0,
                    sellingPrice: mainPrice ? (Number(mainPrice.price) / mainPrice.conversionFactor) : 0,
                    unitId: basePrice?.unitId || (data as any).unitId,
                    conversionFactor: 1
                  }
                });
              }
            } else {
              let remainingToDeduct = Math.abs(diff);
              const activeBatches = await tx.stockBatch.findMany({
                where: { productId: id, currentQuantity: { gt: 0 } },
                orderBy: { createdAt: "asc" }
              });

              for (const batch of activeBatches) {
                if (remainingToDeduct <= 0) break;
                const deduct = Math.min(batch.currentQuantity, remainingToDeduct);
                await tx.stockBatch.update({
                  where: { id: batch.id },
                  data: { currentQuantity: batch.currentQuantity - deduct }
                });
                remainingToDeduct -= deduct;
              }
            }
          }
        }
        // --- END OF STOCK ADJUSTMENT LOGIC ---

        const updateUnitFactor = pricesData?.find((p: any) => String(p.unitId) === String(unitId))?.conversionFactor || 1;

        const product = await tx.product.update({
          where: { id },
          data: {
            code: data.code,
            name: data.name,
            description: data.description,
            categoryId: categoryId || undefined,
            supplierId: supplierId,
            minStock: data.minStock !== undefined ? Number(data.minStock) * updateUnitFactor : undefined,
            averageCost: data.averageCost !== undefined ? Number(data.averageCost) / updateUnitFactor : undefined,
            leadTime: data.leadTime !== undefined ? Number(data.leadTime) : undefined,
            holdingInterval: data.holdingInterval !== undefined ? (data.holdingInterval === null ? null : Number(data.holdingInterval)) : undefined,
            maxStock: data.maxStock !== undefined ? Number(data.maxStock) * updateUnitFactor : undefined,
            safetyStockDays: data.safetyStockDays !== undefined ? Number(data.safetyStockDays) : undefined,
            warehouseCapacity: data.warehouseCapacity !== undefined ? (data.warehouseCapacity === null ? null : Number(data.warehouseCapacity)) : undefined,
          }
        });

        if (data.image !== undefined) {
          if (data.image === "" || data.image === null) {
            await tx.productImage.deleteMany({ where: { productId: id } });
          } else if (data.image.startsWith('data:')) {
            let base64String = data.image;
            let mimeType = 'image/jpeg';
            if (base64String.startsWith('data:')) {
              const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              if (matches && matches.length === 3) {
                mimeType = matches[1];
                base64String = matches[2];
              }
            }
            await tx.productImage.upsert({
              where: { productId: id },
              update: {
                data: Buffer.from(base64String, 'base64'),
                mimeType: mimeType
              },
              create: {
                productId: id,
                data: Buffer.from(base64String, 'base64'),
                mimeType: mimeType
              }
            });
          }
        }

        if (pricesData && pricesData.length > 0) {
          await tx.productPrice.deleteMany({ where: { productId: id } });
          await tx.productPrice.createMany({
            data: pricesData.map((p: any) => ({
              productId: id,
              unitId: p.unitId,
              price: Number(p.price) || 0,
              conversionFactor: Number(p.conversionFactor) || 1
            }))
          });
        }

        if (userId) {
          const { AuditService } = await import("./AuditService.ts");
          await AuditService.log({
            userId,
            action: "UPDATE_PRODUCT",
            entity: "Product",
            entityId: product.id,
            details: { name: product.name, code: product.code }
          });
        }

        return product;
      });
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      console.error("Error updating product:", error);
      throw new ApiError(404, error?.message || "Produk tidak ditemukan atau gagal diperbarui");
    }
  }

  static async delete(id: string, userId?: string) {
    try {
      const product = await prisma.product.findUnique({ where: { id } });
      await prisma.product.update({ 
        where: { id },
        data: { deletedAt: new Date() }
      });

      if (userId && product) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "DELETE_PRODUCT",
          entity: "Product",
          entityId: id,
          details: { name: product.name, code: product.code, note: "Soft Delete" }
        });
      }

      return { success: true };
    } catch (error) {
      throw new ApiError(404, "Produk tidak ditemukan");
    }
  }

  static async addStock(id: string, quantity: number, cost?: number, unitId?: string, conversionFactor?: number, price?: number, userId?: string) {
    const product = await prisma.product.findUnique({ 
      where: { id },
      include: { prices: true }
    });
    if (!product) throw new ApiError(404, "Produk tidak ditemukan");

    return await prisma.$transaction(async (tx) => {
      const actualConversionFactor = conversionFactor || 1;
      const baseQuantity = Number(quantity) * actualConversionFactor;
      const baseCost = cost ? Number(cost) / actualConversionFactor : undefined;
      const targetUnitId = unitId || product.prices.find(p => p.conversionFactor === 1)?.unitId;

      if (price !== undefined && targetUnitId) {
        const productPrice = await tx.productPrice.findFirst({
          where: { productId: id, unitId: targetUnitId }
        });
        if (productPrice) {
          await tx.productPrice.update({
            where: { id: productPrice.id },
            data: { price: Number(price) }
          });
          const memPrice = product.prices.find(p => p.id === productPrice.id);
          if (memPrice) (memPrice as any).price = Number(price);
        }
      }

      // 1. Create Stock Batch for FIFO
      const sortedPrices = [...product.prices].sort((a, b) => b.conversionFactor - a.conversionFactor);
      const mainPriceObj = sortedPrices[0];
      const mainFactor = mainPriceObj?.conversionFactor || 1;
      const basePriceObj = sortedPrices.find(p => p.conversionFactor === 1) || sortedPrices[sortedPrices.length - 1];
      
      const batch = await tx.stockBatch.create({
        data: {
          productId: id,
          initialQuantity: baseQuantity,
          currentQuantity: baseQuantity,
          costPrice: baseCost !== undefined ? baseCost : Number(product.averageCost),
          sellingPrice: price !== undefined ? (Number(price) / actualConversionFactor) : (mainPriceObj ? (Number(mainPriceObj.price) / mainFactor) : 0),
          unitId: unitId || basePriceObj?.unitId,
          conversionFactor: conversionFactor || basePriceObj?.conversionFactor || 1
        }
      });

      // Snapshot prices for manual stock entry
      const currentPrices = await tx.productPrice.findMany({
        where: { productId: id }
      });
      if (currentPrices.length > 0) {
        await tx.stockBatchPrice.createMany({
          data: currentPrices.map(p => ({
            batchId: batch.id,
            unitId: p.unitId,
            price: p.price
          }))
        });
      }

      // 2. Update Product Stock
      const updatedProduct = await tx.product.update({
        where: { id },
        data: { stock: { increment: baseQuantity } }
      });

      // 3. Create Stock Log
      await tx.stockLog.create({
        data: {
          productId: id,
          type: "IN",
          quantity: baseQuantity,
          reason: "Tambah Stok (Manual)"
        }
      });

      // 4. Update Average Cost if provided
      if (baseCost !== undefined) {
        const totalStock = product.stock + baseQuantity;
        const oldStock = product.stock;
        const oldCost = Number(product.averageCost);
        
        if (totalStock > 0) {
          const updatedAverageCost = ((oldStock * oldCost) + (baseQuantity * baseCost)) / totalStock;
          await tx.product.update({
            where: { id },
            data: { averageCost: updatedAverageCost }
          });
        }
      }

      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "ADD_STOCK",
          entity: "Product",
          entityId: id,
          details: { quantity, baseQuantity, cost, baseCost }
        });
      }

      return updatedProduct;
    });
  }

  static async getLogs(id: string, page?: number, limit?: number) {
    const where = { productId: id };
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit ? limit : undefined;

    const [items, total] = await Promise.all([
      prisma.stockLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take
      }),
      prisma.stockLog.count({ where })
    ]);

    return { items, total };
  }

  static async getBatches(id: string, activeOnly: boolean = false) {
    const where: any = { productId: id };
    if (activeOnly) {
      where.currentQuantity = { gt: 0 };
      where.isArchived = false;
    }

    const batches = await prisma.stockBatch.findMany({
      where,
      include: {
        batchPrices: true,
        purchaseItem: {
          include: {
            purchase: {
              include: { supplier: true }
            }
          }
        },
        saleAllocations: {
          include: {
            saleItem: {
              include: {
                product: {
                  include: {
                    prices: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return batches.map((batch: any) => {
      let realizedRevenue = 0;
      let realizedCost = 0;

      batch.saleAllocations?.forEach((alloc: any) => {
        const saleItem = alloc.saleItem;
        if (!saleItem) return;

        // Find conversion factor for the unit used in this sale
        const prices = saleItem.product?.prices || [];
        const productPrice = prices.find((p: any) => p.unitId === saleItem.unitId);
        const conversionFactor = productPrice?.conversionFactor || 1;

        const priceInBaseUnit = saleItem.isBonus ? 0 : (Number(saleItem.priceAtSale) / conversionFactor);
        const allocRevenue = alloc.quantity * priceInBaseUnit;
        const allocCost = alloc.quantity * Number(alloc.costPrice);

        realizedRevenue += allocRevenue;
        realizedCost += allocCost;
      });

      // Remove nested large lists to keep payload light
      const { saleAllocations, ...batchWithoutAllocations } = batch;

      return {
        ...batchWithoutAllocations,
        realizedRevenue,
        realizedCost,
        realizedProfit: realizedRevenue - realizedCost
      };
    });
  }

  /**
   * Mengarsipkan batch yang sudah kosong dan lama (Long Term Efficiency)
   */
  static async archiveOldEmptyBatches(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.stockBatch.updateMany({
      where: {
        currentQuantity: 0,
        isArchived: false,
        updatedAt: { lt: cutoffDate }
      },
      data: { isArchived: true }
    });

    return result.count;
  }

  static async getBatchById(id: string) {
    const batch = await prisma.stockBatch.findUnique({
      where: { id },
      include: {
        batchPrices: true,
        unit: true,
        product: {
          include: {
            prices: { include: { unit: true }, orderBy: { conversionFactor: "asc" } }
          }
        },
        purchaseItem: {
          include: {
            purchase: {
              include: { supplier: true }
            }
          }
        },
        saleAllocations: {
          include: {
            saleItem: {
              include: {
                sale: {
                  include: { user: true }
                },
                unit: true
              }
            }
          }
        }
      }
    });

    if (!batch) return null;

    let realizedRevenue = 0;
    let realizedCost = 0;
    const salesBreakdown = (batch.saleAllocations || []).map((alloc: any) => {
      const saleItem = alloc.saleItem;
      const sale = saleItem?.sale;
      const unit = saleItem?.unit;
      const prices = batch.product?.prices || [];
      const productPrice = prices.find((p: any) => p.unitId === saleItem?.unitId);
      const conversionFactor = productPrice?.conversionFactor || saleItem?.conversionFactor || 1;

      const priceInBaseUnit = saleItem?.isBonus ? 0 : (Number(saleItem?.priceAtSale || 0) / conversionFactor);
      const allocRevenue = alloc.quantity * priceInBaseUnit;
      const allocCost = alloc.quantity * Number(alloc.costPrice || 0);
      const allocProfit = allocRevenue - allocCost;

      realizedRevenue += allocRevenue;
      realizedCost += allocCost;

      return {
        id: alloc.id,
        saleId: sale?.id,
        invoiceNumber: sale?.invoiceNumber || "-",
        createdAt: sale?.createdAt || new Date(),
        paymentStatus: sale?.paymentStatus,
        paymentMethod: sale?.paymentMethod,
        cashierName: sale?.user?.fullName || sale?.user?.username || "Kasir",
        unitName: unit?.name || batch.unit?.name || "Satuan",
        conversionFactor,
        baseQuantity: alloc.quantity,
        saleQuantity: saleItem?.quantity || (alloc.quantity / conversionFactor),
        priceAtSale: Number(saleItem?.priceAtSale || 0),
        isBonus: saleItem?.isBonus || false,
        allocRevenue,
        allocCost,
        allocProfit,
        marginPercent: allocRevenue > 0 ? (allocProfit / allocRevenue) * 100 : 0,
      };
    });

    // Sort sales breakdown by transaction date descending
    salesBreakdown.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const realizedProfit = realizedRevenue - realizedCost;
    const realizedMarginPercent = realizedRevenue > 0 ? (realizedProfit / realizedRevenue) * 100 : 0;
    const unitCost = Number(batch.costPrice || 0);
    const unitSelling = Number(batch.sellingPrice || 0);
    const potentialRemainingProfit = Math.max(0, batch.currentQuantity * (unitSelling - unitCost));

    return {
      ...batch,
      realizedRevenue,
      realizedCost,
      realizedProfit,
      realizedMarginPercent,
      potentialRemainingProfit,
      salesBreakdown,
    };
  }

  static async updateBatch(id: string, data: {
    initialQuantity?: number;
    currentQuantity?: number;
    costPrice?: number;
    sellingPrice?: number;
    isArchived?: boolean;
    batchPrices?: Array<{ unitId: string; price: number }>;
  }, userId?: string) {
    const batch = await prisma.stockBatch.findUnique({ where: { id } });
    if (!batch) throw new ApiError(404, "Batch tidak ditemukan");

    if (data.costPrice !== undefined && Number(data.costPrice) <= 0) {
      throw new ApiError(400, "Harga modal harus lebih dari 0");
    }
    if (data.sellingPrice !== undefined && Number(data.sellingPrice) <= 0) {
      throw new ApiError(400, "Harga jual harus lebih dari 0");
    }
    if (data.batchPrices && Array.isArray(data.batchPrices)) {
      for (const bp of data.batchPrices) {
        if (Number(bp.price) <= 0) {
          throw new ApiError(400, "Harga satuan batch harus lebih dari 0");
        }
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updatedData: any = {};
      let stockDiff = 0;

      if (data.currentQuantity !== undefined) {
        stockDiff = Number(data.currentQuantity) - batch.currentQuantity;
        updatedData.currentQuantity = Number(data.currentQuantity);
      }
      
      if (data.initialQuantity !== undefined) {
        updatedData.initialQuantity = Number(data.initialQuantity);
      }

      if (data.costPrice !== undefined) {
        updatedData.costPrice = Number(data.costPrice);
      }

      if (data.sellingPrice !== undefined) {
        updatedData.sellingPrice = Number(data.sellingPrice);
      }

      if (data.isArchived !== undefined) {
        updatedData.isArchived = data.isArchived;
      }

      const updatedBatch = await tx.stockBatch.update({
        where: { id },
        data: updatedData
      });

      // Upsert unit specific prices (StockBatchPrice)
      if (data.batchPrices && Array.isArray(data.batchPrices) && data.batchPrices.length > 0) {
        for (const bp of data.batchPrices) {
          await tx.stockBatchPrice.upsert({
            where: { batchId_unitId: { batchId: id, unitId: bp.unitId } },
            update: { price: Number(bp.price) },
            create: { batchId: id, unitId: bp.unitId, price: Number(bp.price) }
          });
        }
      }

      // Retroactive HPP Calibration for historical sale allocations
      if (data.costPrice !== undefined) {
        await tx.saleItemBatch.updateMany({
          where: { batchId: id },
          data: { costPrice: Number(data.costPrice) }
        });
      }

      // Synchronize product stock with database if currentQuantity changes
      if (stockDiff !== 0) {
        await tx.product.update({
          where: { id: batch.productId },
          data: { stock: { increment: stockDiff } }
        });

        // Log the adjustment
        await tx.stockLog.create({
          data: {
            productId: batch.productId,
            type: stockDiff > 0 ? "IN" : "OUT",
            quantity: Math.abs(stockDiff),
            reason: `Penyesuaian Batch #${id.slice(-6).toUpperCase()}`
          }
        });
      }

      if (userId) {
        const { AuditService } = await import("./AuditService.ts");
        await AuditService.log({
          userId,
          action: "UPDATE_BATCH",
          entity: "StockBatch",
          entityId: id,
          details: { productId: batch.productId, costPrice: data.costPrice, sellingPrice: data.sellingPrice, stockDiff }
        });
      }

      return updatedBatch;
    });
  }

  static async bulkUpdateParameters(data: any, excludedIds: string[], userId?: string) {
    const { leadTime, holdingInterval, safetyStockDays, warehouseCapacity } = data;

    const whereClause: any = { deletedAt: null };
    if (excludedIds && excludedIds.length > 0) {
      whereClause.id = { notIn: excludedIds };
    }

    const updateData: any = {};
    if (leadTime !== undefined) updateData.leadTime = Number(leadTime);
    if (holdingInterval !== undefined) updateData.holdingInterval = holdingInterval === null ? null : Number(holdingInterval);
    if (safetyStockDays !== undefined) updateData.safetyStockDays = Number(safetyStockDays);
    if (warehouseCapacity !== undefined) updateData.warehouseCapacity = warehouseCapacity === null ? null : Number(warehouseCapacity);

    if (Object.keys(updateData).length === 0) {
      return { success: true, count: 0 };
    }

    const result = await prisma.product.updateMany({
      where: whereClause,
      data: updateData
    });

    if (userId && result.count > 0) {
      const { AuditService } = await import("./AuditService.ts");
      await AuditService.log({
        userId,
        action: "BULK_UPDATE_PARAMS",
        entity: "Product",
        entityId: "BULK",
        details: { updatedFields: updateData, excludedCount: excludedIds?.length || 0, totalUpdated: result.count }
      });
    }

    return { success: true, count: result.count };
  }
}

