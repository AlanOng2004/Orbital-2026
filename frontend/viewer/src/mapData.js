export const campusConfig = {
  buildings: {
    COM1: {
      name: "Computing 1",
      apiBuildingQuery: "COM1",
      rotation: 28.5,
      // These coordinates pin the overlay directly onto the orange COM1 footprint
      anchor: {
        x: 820,
        y: 2010,
        width: 145,
        height: 80,
      },
      floors: [
        { id: "B1", height: 0, img: "COMBLK1_B1.jpg" },
        { id: "L1", height: 1, img: "COMBLK1_01.jpg" },
        { id: "L2", height: 2, img: "COMBLK1_02.jpg" },
        { id: "L3", height: 3, img: "COMBLK1_03.jpg" },
      ],
    },
  },
};
