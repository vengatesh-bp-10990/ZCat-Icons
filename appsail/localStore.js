// Shared in-memory store for local development (no Catalyst DataStore)
const IS_LOCAL = !process.env.X_ZOHO_CATALYST_LISTEN_PORT;

const localStore = {
  icons: [],
  variants: [],
  nextId: 1,
};

module.exports = { IS_LOCAL, localStore };
