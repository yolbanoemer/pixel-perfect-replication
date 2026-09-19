export type CryptoNetwork = {
  code: "BTC" | "SOL" | "LTC";
  name: string;
  network: string;
  address: string;
};

export const cryptoNetworks: CryptoNetwork[] = [
  {
    code: "BTC",
    name: "Bitcoin",
    network: "Bitcoin (native SegWit)",
    address: "bc1qnyq0e5jvdaf6cpu8etnpl83e55sre6c2tr8wpm",
  },
  {
    code: "SOL",
    name: "Solana",
    network: "Solana (SPL)",
    address: "E96xiJ9yrW3YzYzRmLoUMkixeHTj8VEQ7VjJo9Z7viA2",
  },
  {
    code: "LTC",
    name: "Litecoin",
    network: "Litecoin",
    address: "LgPV91E2QaUc4inehudBZFhtR3Hjm9KX3C",
  },
];

/** Countries offered for bank transfer — deposits by bank are not live yet. */
export const bankCountries = [
  "Germany",
  "Austria",
  "Switzerland",
  "United Kingdom",
  "United States",
  "Canada",
  "Nigeria",
  "South Africa",
  "Australia",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
];
