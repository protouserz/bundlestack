import os from "node:os";

const originalCpus = os.cpus.bind(os);
os.cpus = () => {
  const cpus = originalCpus();
  if (cpus.length > 0) return cpus;
  return [
    {
      model: "virtual",
      speed: 0,
      times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
    },
  ];
};
