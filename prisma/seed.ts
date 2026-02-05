import { config } from 'dotenv';
import { PrismaClient, ProductCategory, AvailabilityStatus } from '@prisma/client';

// Load environment variables from .env file
config();

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data (development only)
  await prisma.productRecommendation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  console.log('Cleared existing data');

  // =============== FISH PRODUCTS ===============
  const fishProducts = await Promise.all([
    // Whole Fish
    prisma.product.create({
      data: {
        name: 'Tilapia Whole 500g',
        nameSwahili: 'Samaki Tilapia 500g',
        category: ProductCategory.FISH,
        description: 'Fresh whole tilapia from Lake Victoria, 500g',
        descriptionSwahili: 'Samaki tilapia safi kutoka Ziwa Victoria, 500g',
        attributes: {
          fishType: 'WHOLE',
          size: '500g',
          origin: 'Lake Victoria',
          prepType: 'Fresh',
          cleaned: true
        },
        basePrice: 250,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 1
      }
    }),
    prisma.product.create({
      data: {
        name: 'Tilapia Whole 1kg',
        nameSwahili: 'Samaki Tilapia 1kg',
        category: ProductCategory.FISH,
        description: 'Fresh whole tilapia from Lake Victoria, 1kg',
        descriptionSwahili: 'Samaki tilapia safi kutoka Ziwa Victoria, 1kg',
        attributes: {
          fishType: 'WHOLE',
          size: '1kg',
          origin: 'Lake Victoria',
          prepType: 'Fresh',
          cleaned: true
        },
        basePrice: 450,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 2
      }
    }),
    prisma.product.create({
      data: {
        name: 'Tilapia Whole 1.5kg',
        nameSwahili: 'Samaki Tilapia 1.5kg',
        category: ProductCategory.FISH,
        description: 'Fresh whole tilapia from Lake Victoria, 1.5kg',
        descriptionSwahili: 'Samaki tilapia safi kutoka Ziwa Victoria, 1.5kg',
        attributes: {
          fishType: 'WHOLE',
          size: '1.5kg',
          origin: 'Lake Victoria',
          prepType: 'Fresh',
          cleaned: true
        },
        basePrice: 650,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 3
      }
    }),
    prisma.product.create({
      data: {
        name: 'Nile Perch Whole 1kg',
        nameSwahili: 'Sangara 1kg',
        category: ProductCategory.FISH,
        description: 'Fresh whole Nile Perch from Lake Victoria, 1kg',
        descriptionSwahili: 'Sangara safi kutoka Ziwa Victoria, 1kg',
        attributes: {
          fishType: 'WHOLE',
          size: '1kg',
          origin: 'Lake Victoria',
          prepType: 'Fresh',
          cleaned: true
        },
        basePrice: 800,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 4
      }
    }),
    prisma.product.create({
      data: {
        name: 'Catfish Whole',
        nameSwahili: 'Mumi',
        category: ProductCategory.FISH,
        description: 'Fresh whole catfish, various sizes available',
        descriptionSwahili: 'Mumi safi, ukubwa mbalimbali',
        attributes: {
          fishType: 'WHOLE',
          origin: 'Lake Victoria',
          prepType: 'Fresh',
          cleaned: true
        },
        basePrice: 600,
        unit: 'per kg',
        availability: AvailabilityStatus.AVAILABLE_ON_REQUEST,
        availabilityNotes: 'Please confirm availability before ordering',
        displayOrder: 5
      }
    }),

    // Fish Fillets
    prisma.product.create({
      data: {
        name: 'Tilapia Fillet',
        nameSwahili: 'Fillet ya Tilapia',
        category: ProductCategory.FISH,
        description: 'Boneless tilapia fillet, fresh and ready to cook',
        descriptionSwahili: 'Fillet ya tilapia bila mifupa, safi na tayari kupikwa',
        attributes: {
          fishType: 'FILLET',
          origin: 'Lake Victoria',
          prepType: 'Fresh',
          boneless: true
        },
        basePrice: 600,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 6
      }
    }),
    prisma.product.create({
      data: {
        name: 'Nile Perch Fillet',
        nameSwahili: 'Fillet ya Sangara',
        category: ProductCategory.FISH,
        description: 'Boneless Nile Perch fillet, premium quality',
        descriptionSwahili: 'Fillet ya sangara bila mifupa, ubora wa juu',
        attributes: {
          fishType: 'FILLET',
          origin: 'Lake Victoria',
          prepType: 'Fresh',
          boneless: true
        },
        basePrice: 950,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 7
      }
    }),

    // Fried Fish
    prisma.product.create({
      data: {
        name: 'Fried Tilapia',
        nameSwahili: 'Tilapia Kaangwa',
        category: ProductCategory.FISH,
        description: 'Crispy fried tilapia, ready to eat',
        descriptionSwahili: 'Tilapia kaangwa, tayari kula',
        attributes: {
          fishType: 'FRIED',
          size: '1kg',
          origin: 'Lake Victoria',
          prepType: 'Fried'
        },
        basePrice: 700,
        unit: 'per piece',
        availability: AvailabilityStatus.AVAILABLE_ON_REQUEST,
        availabilityNotes: 'Order in advance, prepared fresh',
        displayOrder: 8
      }
    })
  ]);

  console.log(`Created ${fishProducts.length} fish products`);

  // =============== CHICKEN PRODUCTS ===============
  const chickenProducts = await Promise.all([
    // Whole Chicken
    prisma.product.create({
      data: {
        name: 'Broiler Chicken 1kg',
        nameSwahili: 'Kuku wa Broiler 1kg',
        category: ProductCategory.CHICKEN,
        description: 'Fresh whole broiler chicken, 1kg',
        descriptionSwahili: 'Kuku mzima wa broiler, 1kg',
        attributes: {
          chickenType: 'WHOLE',
          breed: 'Broiler',
          weight: '1kg',
          prepType: 'Fresh'
        },
        basePrice: 450,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 10
      }
    }),
    prisma.product.create({
      data: {
        name: 'Broiler Chicken 1.5kg',
        nameSwahili: 'Kuku wa Broiler 1.5kg',
        category: ProductCategory.CHICKEN,
        description: 'Fresh whole broiler chicken, 1.5kg',
        descriptionSwahili: 'Kuku mzima wa broiler, 1.5kg',
        attributes: {
          chickenType: 'WHOLE',
          breed: 'Broiler',
          weight: '1.5kg',
          prepType: 'Fresh'
        },
        basePrice: 650,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 11
      }
    }),
    prisma.product.create({
      data: {
        name: 'Broiler Chicken 1.8kg',
        nameSwahili: 'Kuku wa Broiler 1.8kg',
        category: ProductCategory.CHICKEN,
        description: 'Fresh whole broiler chicken, 1.8kg',
        descriptionSwahili: 'Kuku mzima wa broiler, 1.8kg',
        attributes: {
          chickenType: 'WHOLE',
          breed: 'Broiler',
          weight: '1.8kg',
          prepType: 'Fresh'
        },
        basePrice: 780,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 12
      }
    }),
    prisma.product.create({
      data: {
        name: 'Kienyeji Chicken 1.5kg',
        nameSwahili: 'Kuku Kienyeji 1.5kg',
        category: ProductCategory.CHICKEN,
        description: 'Free-range kienyeji chicken, 1.5kg',
        descriptionSwahili: 'Kuku kienyeji, 1.5kg',
        attributes: {
          chickenType: 'WHOLE',
          breed: 'Kienyeji',
          weight: '1.5kg',
          prepType: 'Fresh'
        },
        basePrice: 900,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 13
      }
    }),

    // Chicken Parts
    prisma.product.create({
      data: {
        name: 'Chicken Breast',
        nameSwahili: 'Kidari cha Kuku',
        category: ProductCategory.CHICKEN,
        description: 'Fresh chicken breast, boneless',
        descriptionSwahili: 'Kidari cha kuku safi, bila mifupa',
        attributes: {
          chickenType: 'PARTS',
          part: 'Breast',
          prepType: 'Fresh',
          boneless: true
        },
        basePrice: 650,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 14
      }
    }),
    prisma.product.create({
      data: {
        name: 'Chicken Thighs',
        nameSwahili: 'Mapaja ya Kuku',
        category: ProductCategory.CHICKEN,
        description: 'Fresh chicken thighs',
        descriptionSwahili: 'Mapaja ya kuku safi',
        attributes: {
          chickenType: 'PARTS',
          part: 'Thighs',
          prepType: 'Fresh'
        },
        basePrice: 550,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 15
      }
    }),
    prisma.product.create({
      data: {
        name: 'Chicken Drumsticks',
        nameSwahili: 'Drumsticks za Kuku',
        category: ProductCategory.CHICKEN,
        description: 'Fresh chicken drumsticks',
        descriptionSwahili: 'Drumsticks za kuku safi',
        attributes: {
          chickenType: 'PARTS',
          part: 'Drumsticks',
          prepType: 'Fresh'
        },
        basePrice: 500,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 16
      }
    }),
    prisma.product.create({
      data: {
        name: 'Chicken Wings',
        nameSwahili: 'Mabawa ya Kuku',
        category: ProductCategory.CHICKEN,
        description: 'Fresh chicken wings, great for BBQ',
        descriptionSwahili: 'Mabawa ya kuku safi, nzuri kwa BBQ',
        attributes: {
          chickenType: 'PARTS',
          part: 'Wings',
          prepType: 'Fresh'
        },
        basePrice: 450,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 17
      }
    }),
    prisma.product.create({
      data: {
        name: 'Chicken Gizzards',
        nameSwahili: 'Matumbo ya Kuku',
        category: ProductCategory.CHICKEN,
        description: 'Fresh chicken gizzards',
        descriptionSwahili: 'Matumbo ya kuku safi',
        attributes: {
          chickenType: 'PARTS',
          part: 'Gizzards',
          prepType: 'Fresh'
        },
        basePrice: 400,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 18
      }
    }),
    prisma.product.create({
      data: {
        name: 'Chicken Liver',
        nameSwahili: 'Ini ya Kuku',
        category: ProductCategory.CHICKEN,
        description: 'Fresh chicken liver',
        descriptionSwahili: 'Ini ya kuku safi',
        attributes: {
          chickenType: 'PARTS',
          part: 'Liver',
          prepType: 'Fresh'
        },
        basePrice: 380,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 19
      }
    }),

    // Fried Chicken
    prisma.product.create({
      data: {
        name: 'Fried Chicken',
        nameSwahili: 'Kuku Kaangwa',
        category: ProductCategory.CHICKEN,
        description: 'Crispy fried chicken, ready to eat',
        descriptionSwahili: 'Kuku kaangwa, tayari kula',
        attributes: {
          chickenType: 'FRIED',
          prepType: 'Fried'
        },
        basePrice: 750,
        unit: 'per kg',
        availability: AvailabilityStatus.AVAILABLE_ON_REQUEST,
        availabilityNotes: 'Order in advance, prepared fresh',
        displayOrder: 20
      }
    })
  ]);

  console.log(`Created ${chickenProducts.length} chicken products`);

  // =============== VEGETABLE PRODUCTS ===============
  const vegetableProducts = await Promise.all([
    // Leafy Greens
    prisma.product.create({
      data: {
        name: 'Sukuma Wiki (Kale)',
        nameSwahili: 'Sukuma Wiki',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh kale bundle, locally grown',
        descriptionSwahili: 'Sukuma wiki safi, imeoteshwa hapa',
        attributes: {
          vegetableType: 'LEAFY',
          unit: 'bundle'
        },
        basePrice: 40,
        unit: 'per bundle',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 30
      }
    }),
    prisma.product.create({
      data: {
        name: 'Spinach',
        nameSwahili: 'Mchicha',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh spinach bundle',
        descriptionSwahili: 'Mchicha safi',
        attributes: {
          vegetableType: 'LEAFY',
          unit: 'bundle'
        },
        basePrice: 45,
        unit: 'per bundle',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 31
      }
    }),
    prisma.product.create({
      data: {
        name: 'Managu (African Nightshade)',
        nameSwahili: 'Managu',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh managu bundle, traditional vegetable',
        descriptionSwahili: 'Managu safi',
        attributes: {
          vegetableType: 'LEAFY',
          unit: 'bundle'
        },
        basePrice: 50,
        unit: 'per bundle',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 32
      }
    }),
    prisma.product.create({
      data: {
        name: 'Cabbage',
        nameSwahili: 'Kabichi',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh whole cabbage',
        descriptionSwahili: 'Kabichi mzima safi',
        attributes: {
          vegetableType: 'LEAFY',
          unit: 'whole'
        },
        basePrice: 80,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 33
      }
    }),

    // Root Vegetables
    prisma.product.create({
      data: {
        name: 'Irish Potatoes',
        nameSwahili: 'Viazi',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh Irish potatoes',
        descriptionSwahili: 'Viazi safi',
        attributes: {
          vegetableType: 'ROOT'
        },
        basePrice: 120,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 34
      }
    }),
    prisma.product.create({
      data: {
        name: 'Sweet Potatoes',
        nameSwahili: 'Viazi Vitamu',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh sweet potatoes',
        descriptionSwahili: 'Viazi vitamu safi',
        attributes: {
          vegetableType: 'ROOT'
        },
        basePrice: 100,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 35
      }
    }),
    prisma.product.create({
      data: {
        name: 'Carrots',
        nameSwahili: 'Karoti',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh carrots',
        descriptionSwahili: 'Karoti safi',
        attributes: {
          vegetableType: 'ROOT'
        },
        basePrice: 140,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 36
      }
    }),

    // Other Vegetables
    prisma.product.create({
      data: {
        name: 'Tomatoes',
        nameSwahili: 'Nyanya',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh ripe tomatoes',
        descriptionSwahili: 'Nyanya safi na mbivu',
        attributes: {
          vegetableType: 'OTHER'
        },
        basePrice: 120,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 37
      }
    }),
    prisma.product.create({
      data: {
        name: 'Red Onions',
        nameSwahili: 'Vitunguu Nyekundu',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh red onions',
        descriptionSwahili: 'Vitunguu nyekundu safi',
        attributes: {
          vegetableType: 'OTHER',
          color: 'red'
        },
        basePrice: 100,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 38
      }
    }),
    prisma.product.create({
      data: {
        name: 'White Onions',
        nameSwahili: 'Vitunguu Nyeupe',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh white onions',
        descriptionSwahili: 'Vitunguu nyeupe safi',
        attributes: {
          vegetableType: 'OTHER',
          color: 'white'
        },
        basePrice: 110,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 39
      }
    }),
    prisma.product.create({
      data: {
        name: 'Dhania (Coriander)',
        nameSwahili: 'Dhania',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh coriander bundle',
        descriptionSwahili: 'Dhania safi',
        attributes: {
          vegetableType: 'OTHER',
          unit: 'bundle'
        },
        basePrice: 30,
        unit: 'per bundle',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 40
      }
    }),
    prisma.product.create({
      data: {
        name: 'Capsicum (Bell Pepper)',
        nameSwahili: 'Pilipili Hoho',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh bell peppers',
        descriptionSwahili: 'Pilipili hoho safi',
        attributes: {
          vegetableType: 'OTHER'
        },
        basePrice: 60,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 41
      }
    })
  ]);

  console.log(`Created ${vegetableProducts.length} vegetable products`);

  // =============== VALUE BASKETS ===============
  const basketProducts = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Family Dinner Basket',
        nameSwahili: 'Kikapu cha Chakula cha Familia',
        category: ProductCategory.VALUE_BASKET,
        description: 'Complete family meal: 1.5kg chicken, vegetables, and potatoes',
        descriptionSwahili: 'Chakula kamili cha familia: kuku 1.5kg, mboga na viazi',
        attributes: {
          contents: ['Broiler Chicken 1.5kg', 'Sukuma Wiki', 'Tomatoes 1kg', 'Onions 1kg', 'Irish Potatoes 2kg']
        },
        basePrice: 1500,
        unit: 'per basket',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 50
      }
    }),
    prisma.product.create({
      data: {
        name: 'Fish Lover\'s Basket',
        nameSwahili: 'Kikapu cha Samaki',
        category: ProductCategory.VALUE_BASKET,
        description: 'Variety of fresh fish: 1kg tilapia, 500g Nile perch fillet, vegetables',
        descriptionSwahili: 'Samaki mbalimbali: tilapia 1kg, fillet ya sangara 500g, mboga',
        attributes: {
          contents: ['Tilapia Whole 1kg', 'Nile Perch Fillet 500g', 'Tomatoes 1kg', 'Onions 500g', 'Dhania']
        },
        basePrice: 2000,
        unit: 'per basket',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 51
      }
    }),
    prisma.product.create({
      data: {
        name: 'Vegetarian Basket',
        nameSwahili: 'Kikapu cha Mboga',
        category: ProductCategory.VALUE_BASKET,
        description: 'Fresh vegetable selection: leafy greens, roots, and more',
        descriptionSwahili: 'Mboga safi mbalimbali',
        attributes: {
          contents: ['Sukuma Wiki', 'Spinach', 'Cabbage', 'Carrots 1kg', 'Tomatoes 1kg', 'Onions 1kg', 'Irish Potatoes 2kg']
        },
        basePrice: 800,
        unit: 'per basket',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 52
      }
    }),
    prisma.product.create({
      data: {
        name: 'Budget Basket',
        nameSwahili: 'Kikapu cha Bei Nafuu',
        category: ProductCategory.VALUE_BASKET,
        description: 'Affordable essentials under KES 1,000',
        descriptionSwahili: 'Vitu muhimu kwa bei nafuu chini ya KES 1,000',
        attributes: {
          contents: ['Broiler Chicken 1kg', 'Sukuma Wiki 2 bundles', 'Tomatoes 1kg', 'Onions 1kg', 'Irish Potatoes 1kg']
        },
        basePrice: 950,
        unit: 'per basket',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 53
      }
    })
  ]);

  console.log(`Created ${basketProducts.length} value basket products`);

  // =============== PRODUCT RECOMMENDATIONS ===============
  // Create some initial recommendations based on common combinations
  const recommendations = await Promise.all([
    // Fish + Vegetables
    prisma.productRecommendation.create({
      data: {
        productId: fishProducts[1].id, // Tilapia 1kg
        recommendedId: vegetableProducts[7].id, // Tomatoes
        strength: 5.0
      }
    }),
    prisma.productRecommendation.create({
      data: {
        productId: fishProducts[1].id, // Tilapia 1kg
        recommendedId: vegetableProducts[8].id, // Red Onions
        strength: 4.5
      }
    }),
    prisma.productRecommendation.create({
      data: {
        productId: fishProducts[1].id, // Tilapia 1kg
        recommendedId: vegetableProducts[10].id, // Dhania
        strength: 4.0
      }
    }),

    // Chicken + Vegetables
    prisma.productRecommendation.create({
      data: {
        productId: chickenProducts[4].id, // Chicken Breast
        recommendedId: vegetableProducts[4].id, // Irish Potatoes
        strength: 5.0
      }
    }),
    prisma.productRecommendation.create({
      data: {
        productId: chickenProducts[4].id, // Chicken Breast
        recommendedId: vegetableProducts[7].id, // Tomatoes
        strength: 4.5
      }
    }),
    prisma.productRecommendation.create({
      data: {
        productId: chickenProducts[4].id, // Chicken Breast
        recommendedId: vegetableProducts[8].id, // Red Onions
        strength: 4.0
      }
    }),

    // Sukuma Wiki combinations
    prisma.productRecommendation.create({
      data: {
        productId: vegetableProducts[0].id, // Sukuma Wiki
        recommendedId: vegetableProducts[7].id, // Tomatoes
        strength: 5.0
      }
    }),
    prisma.productRecommendation.create({
      data: {
        productId: vegetableProducts[0].id, // Sukuma Wiki
        recommendedId: vegetableProducts[8].id, // Red Onions
        strength: 4.5
      }
    })
  ]);

  console.log(`Created ${recommendations.length} product recommendations`);

  console.log('Database seed completed successfully!');
  console.log('\nSummary:');
  console.log(`- ${fishProducts.length} fish products`);
  console.log(`- ${chickenProducts.length} chicken products`);
  console.log(`- ${vegetableProducts.length} vegetable products`);
  console.log(`- ${basketProducts.length} value baskets`);
  console.log(`- ${recommendations.length} product recommendations`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
