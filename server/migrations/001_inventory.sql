CREATE SCHEMA IF NOT EXISTS pronto_stock;
CREATE TABLE IF NOT EXISTS pronto_stock.inventory_metadata (
  id integer PRIMARY KEY CHECK (id = 1),
  version integer NOT NULL,
  updated_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS pronto_stock.products (
  id text PRIMARY KEY, sku text NOT NULL, name text NOT NULL,
  category text NOT NULL, unit text NOT NULL,
  stock numeric NOT NULL CHECK(stock >= 0), min_stock numeric NOT NULL CHECK(min_stock >= 0),
  unit_cost numeric NOT NULL CHECK(unit_cost >= 0), is_backpack boolean NOT NULL,
  active boolean NOT NULL, notes text NOT NULL, created_at text NOT NULL, updated_at text NOT NULL,
  position integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON pronto_stock.products (upper(sku));
CREATE TABLE IF NOT EXISTS pronto_stock.kit_models (
  id text PRIMARY KEY, name text NOT NULL, description text NOT NULL,
  sale_price numeric NOT NULL CHECK(sale_price >= 0),
  platform_fee_percent numeric NOT NULL CHECK(platform_fee_percent BETWEEN 0 AND 100),
  extra_cost numeric NOT NULL CHECK(extra_cost >= 0), updated_at text NOT NULL, position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS pronto_stock.kit_components (
  kit_model_id text REFERENCES pronto_stock.kit_models(id) DEFERRABLE INITIALLY DEFERRED,
  product_id text REFERENCES pronto_stock.products(id) DEFERRABLE INITIALLY DEFERRED,
  quantity numeric NOT NULL CHECK(quantity > 0), position integer NOT NULL,
  PRIMARY KEY(kit_model_id, product_id)
);
CREATE TABLE IF NOT EXISTS pronto_stock.movements (
  id text PRIMARY KEY, type text NOT NULL CHECK(type IN ('entrada','saida','montagem','venda-kit')),
  date text NOT NULL, created_at text NOT NULL,
  product_id text REFERENCES pronto_stock.products(id) DEFERRABLE INITIALLY DEFERRED,
  kit_model_id text REFERENCES pronto_stock.kit_models(id) DEFERRABLE INITIALLY DEFERRED,
  quantity numeric NOT NULL CHECK(quantity > 0), unit_cost numeric CHECK(unit_cost >= 0),
  sale_price numeric CHECK(sale_price >= 0), note text NOT NULL,
  has_snapshot boolean NOT NULL, position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS pronto_stock.movement_components (
  movement_id text REFERENCES pronto_stock.movements(id) DEFERRABLE INITIALLY DEFERRED,
  position integer NOT NULL, product_id text REFERENCES pronto_stock.products(id) DEFERRABLE INITIALLY DEFERRED,
  quantity numeric NOT NULL CHECK(quantity > 0), unit_cost numeric NOT NULL CHECK(unit_cost >= 0),
  PRIMARY KEY(movement_id, position)
);
CREATE TABLE IF NOT EXISTS pronto_stock.pending_purchases (
  id text PRIMARY KEY, product_id text NOT NULL REFERENCES pronto_stock.products(id) DEFERRABLE INITIALLY DEFERRED,
  quantity numeric NOT NULL CHECK(quantity > 0), expected_date text, note text NOT NULL,
  status text NOT NULL CHECK(status IN ('pendente','recebido','cancelado')),
  created_at text NOT NULL, received_at text, position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS pronto_stock.finished_kits (
  kit_model_id text PRIMARY KEY REFERENCES pronto_stock.kit_models(id) DEFERRABLE INITIALLY DEFERRED,
  quantity numeric NOT NULL CHECK(quantity >= 0)
);
CREATE TABLE IF NOT EXISTS pronto_stock.inventory_backups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(), reason text NOT NULL, data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS movements_product_idx ON pronto_stock.movements(product_id);
CREATE INDEX IF NOT EXISTS movements_kit_idx ON pronto_stock.movements(kit_model_id);
CREATE INDEX IF NOT EXISTS pending_product_idx ON pronto_stock.pending_purchases(product_id);
