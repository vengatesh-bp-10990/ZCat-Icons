/**
 * ZCat Icons — Catalyst DataStore Schema
 *
 * Create these tables in Zoho Catalyst Console → DataStore before deploying.
 *
 * TABLE: Icons
 * ┌──────────────┬──────────┬───────────────────────────┐
 * │ Column       │ Type     │ Notes                     │
 * ├──────────────┼──────────┼───────────────────────────┤
 * │ ROWID        │ BIGINT   │ Auto (primary key)        │
 * │ name         │ TEXT     │ Required, display name    │
 * │ slug         │ TEXT     │ Unique, URL-safe          │
 * │ category_id  │ BIGINT   │ FK → Categories.ROWID     │
 * │ tags         │ TEXT     │ Comma-separated           │
 * │ is_free      │ BOOLEAN  │ Default: true             │
 * │ created_by   │ TEXT     │ Catalyst user_id          │
 * │ CREATEDTIME  │ DATETIME │ Auto                      │
 * │ MODIFIEDTIME │ DATETIME │ Auto                      │
 * └──────────────┴──────────┴───────────────────────────┘
 *
 * TABLE: IconVariants
 * ┌──────────────┬──────────┬──────────────────────────────┐
 * │ Column       │ Type     │ Notes                        │
 * ├──────────────┼──────────┼──────────────────────────────┤
 * │ ROWID        │ BIGINT   │ Auto (primary key)           │
 * │ icon_id      │ BIGINT   │ FK → Icons.ROWID             │
 * │ style        │ TEXT     │ "outlined"|"solid"|"duotone" │
 * │ svg_code     │ TEXT     │ Full SVG markup              │
 * │ stratus_url  │ TEXT     │ Stratus object URL           │
 * │ CREATEDTIME  │ DATETIME │ Auto                         │
 * └──────────────┴──────────┴──────────────────────────────┘
 *
 * TABLE: Categories
 * ┌──────────────┬──────────┬───────────────────────────┐
 * │ Column       │ Type     │ Notes                     │
 * ├──────────────┼──────────┼───────────────────────────┤
 * │ ROWID        │ BIGINT   │ Auto (primary key)        │
 * │ name         │ TEXT     │ Unique, display name      │
 * │ slug         │ TEXT     │ URL-safe                  │
 * │ icon_count   │ INT      │ Cached count              │
 * │ CREATEDTIME  │ DATETIME │ Auto                      │
 * └──────────────┴──────────┴───────────────────────────┘
 *
 * STRATUS BUCKET: zcat-icons
 * Object path pattern: icons/{slug}/{style}.svg
 *
 * SETUP STEPS:
 * 1. Go to Catalyst Console → DataStore
 * 2. Create tables: Icons, IconVariants, Categories (exact names)
 * 3. Add columns as described above (ROWID, CREATEDTIME, MODIFIEDTIME are automatic)
 * 4. Go to Catalyst Console → Stratus → Create bucket "zcat-icons"
 * 5. Set environment variables in AppSail config (GROQ_API_KEY, ALLOWED_ORIGINS)
 * 6. Deploy: catalyst deploy
 */

module.exports = {
  tables: {
    Icons: {
      columns: ["name", "slug", "category_id", "tags", "is_free", "created_by"],
    },
    IconVariants: {
      columns: ["icon_id", "style", "svg_code", "stratus_url"],
    },
    Categories: {
      columns: ["name", "slug", "icon_count"],
    },
  },
  stratusBucket: "zcat-icons",
};
