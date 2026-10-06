export const CHEST_EXERCISES = [
  {
    slug: "bench-press",
    name: "Bench Press",
    description: "Barbell horizontal press for chest strength.",
    category: "strength",
    muscle_group: "chest",
    muscles: [
      "triceps",
      "anterior-deltoid"
    ],
    equipment: [
      "barbell",
      "bench"
    ],
    difficulty: "intermediate",
    tags: [
      "compound",
      "push",
      "upper-body"
    ],
    instructions: [
      "Lie on the bench with feet planted firmly.",
      "Grip the bar slightly wider than shoulder width.",
      "Lower the bar under control toward the mid chest.",
      "Press upward until the arms are extended."
    ],
    image_url: "/images/exercises/bench-press.webp",
    default_sets: 3,
    default_reps: "6-10",
    default_rest: 120,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "incline-bench-press",
    name: "Incline Bench Press",
    description: "Incline barbell press emphasizing upper chest.",
    category: "strength",
    muscle_group: "chest",
    muscles: [
      "triceps",
      "anterior-deltoid"
    ],
    equipment: [
      "barbell",
      "bench"
    ],
    difficulty: "intermediate",
    tags: [
      "compound",
      "push",
      "upper-body"
    ],
    instructions: [
      "Set the bench to a moderate incline.",
      "Unrack the bar with shoulder blades pulled back.",
      "Lower the bar toward the upper chest.",
      "Press up without bouncing."
    ],
    image_url: "/images/exercises/incline-bench-press.webp",
    default_sets: 3,
    default_reps: "6-10",
    default_rest: 120,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "dumbbell-bench-press",
    name: "Dumbbell Bench Press",
    description: "Dumbbell press for chest with independent arm control.",
    category: "strength",
    muscle_group: "chest",
    muscles: [
      "triceps",
      "anterior-deltoid"
    ],
    equipment: [
      "dumbbells",
      "bench"
    ],
    difficulty: "intermediate",
    tags: [
      "compound",
      "push",
      "upper-body"
    ],
    instructions: [
      "Lie on a flat bench with a dumbbell in each hand.",
      "Start with dumbbells beside the chest.",
      "Press both dumbbells upward under control.",
      "Lower until the chest and shoulders stay stable."
    ],
    image_url: "/images/exercises/dumbbell-bench-press.webp",
    default_sets: 3,
    default_reps: "6-10",
    default_rest: 120,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "incline-dumbbell-press",
    name: "Incline Dumbbell Press",
    description: "Incline dumbbell press for upper chest and shoulders.",
    category: "strength",
    muscle_group: "chest",
    muscles: [
      "triceps",
      "anterior-deltoid"
    ],
    equipment: [
      "dumbbells",
      "bench"
    ],
    difficulty: "intermediate",
    tags: [
      "compound",
      "push",
      "upper-body"
    ],
    instructions: [
      "Set the bench to an incline.",
      "Hold dumbbells at shoulder level.",
      "Press up and slightly inward.",
      "Lower with control to the starting position."
    ],
    image_url: "/images/exercises/incline-dumbbell-press.webp",
    default_sets: 3,
    default_reps: "6-10",
    default_rest: 120,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "push-up",
    name: "Push Up",
    description: "Bodyweight horizontal press for chest and triceps.",
    category: "bodyweight",
    muscle_group: "chest",
    muscles: [
      "triceps",
      "anterior-deltoid",
      "core"
    ],
    equipment: [
      "bodyweight"
    ],
    difficulty: "beginner",
    tags: [
      "bodyweight",
      "push",
      "upper-body"
    ],
    instructions: [
      "Start in a straight-arm plank.",
      "Brace the core and keep the body in one line.",
      "Lower the chest toward the floor.",
      "Press back to the starting position."
    ],
    image_url: "/images/exercises/push-up.webp",
    default_sets: 3,
    default_reps: "8-15",
    default_rest: 75,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "chest-fly",
    name: "Chest Fly",
    description: "Dumbbell fly for chest isolation.",
    category: "strength",
    muscle_group: "chest",
    muscles: [
      "anterior-deltoid"
    ],
    equipment: [
      "dumbbells",
      "bench"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "push",
      "upper-body"
    ],
    instructions: [
      "Lie on a bench with dumbbells above the chest.",
      "Keep a soft bend in the elbows.",
      "Open the arms until the chest stretches.",
      "Bring the dumbbells back over the chest."
    ],
    image_url: "/images/exercises/chest-fly.webp",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "cable-fly",
    name: "Cable Fly",
    description: "Cable chest fly with constant tension.",
    category: "strength",
    muscle_group: "chest",
    muscles: [
      "anterior-deltoid"
    ],
    equipment: [
      "cable-machine"
    ],
    difficulty: "beginner",
    tags: [
      "isolation",
      "push",
      "upper-body"
    ],
    instructions: [
      "Set cable handles around chest height.",
      "Step forward with a stable stance.",
      "Bring the handles together in front of the chest.",
      "Return slowly until the chest stretches."
    ],
    image_url: "/images/exercises/cable-fly.webp",
    default_sets: 3,
    default_reps: "10-15",
    default_rest: 60,
    source_type: "builtin",
    status: "active"
  },
  {
    slug: "machine-chest-press",
    name: "Machine Chest Press",
    description: "Guided chest press machine for controlled pressing.",
    category: "strength",
    muscle_group: "chest",
    muscles: [
      "triceps",
      "anterior-deltoid"
    ],
    equipment: [
      "machine"
    ],
    difficulty: "intermediate",
    tags: [
      "push",
      "upper-body"
    ],
    instructions: [
      "Adjust the seat so handles align with mid chest.",
      "Brace against the back pad.",
      "Press the handles forward smoothly.",
      "Return until the chest stretches without losing position."
    ],
    image_url: "/images/exercises/machine-chest-press.webp",
    default_sets: 3,
    default_reps: "6-10",
    default_rest: 120,
    source_type: "builtin",
    status: "active"
  }
]
