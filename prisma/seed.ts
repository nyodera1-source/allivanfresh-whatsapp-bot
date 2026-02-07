import { config } from 'dotenv';
import { PrismaClient, ProductCategory, AvailabilityStatus } from '@prisma/client';

// Load environment variables from .env file
config();

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  await prisma.productRecommendation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  console.log('Cleared existing data');

  // =============== FISH — Free Delivery Anchors ===============
  const fishProducts = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Tilapia (Medium)',
        nameSwahili: 'Samaki Tilapia',
        category: ProductCategory.FISH,
        description: 'Lake fresh tilapia, cleaned and ready to cook',
        descriptionSwahili: 'Samaki tilapia safi kutoka ziwa, imesafishwa na tayari kupikwa',
        attributes: {
          fishType: 'WHOLE',
          origin: 'Lake Victoria',
          prepType: 'Fresh',
          cleaned: true
        },
        basePrice: 600,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 1
      }
    }),
    prisma.product.create({
      data: {
        name: 'Nile Perch',
        nameSwahili: 'Sangara',
        category: ProductCategory.FISH,
        description: 'Lake fresh Nile Perch, cleaned and ready to cook',
        descriptionSwahili: 'Sangara safi kutoka ziwa, imesafishwa na tayari kupikwa',
        attributes: {
          fishType: 'WHOLE',
          origin: 'Lake Victoria',
          prepType: 'Fresh',
          cleaned: true
        },
        basePrice: 900,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 2
      }
    }),
  ]);

  console.log(`Created ${fishProducts.length} fish products`);

  // =============== CHICKEN — Free Delivery Anchors ===============
  const chickenProducts = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Kienyeji Chicken',
        nameSwahili: 'Kuku Kienyeji',
        category: ProductCategory.CHICKEN,
        description: 'Freshly sourced free-range kienyeji chicken, approximately 1.5kg, hygienically handled',
        descriptionSwahili: 'Kuku kienyeji safi, takriban 1.5kg',
        attributes: {
          chickenType: 'WHOLE',
          breed: 'Kienyeji',
          weight: '~1.5kg',
          prepType: 'Fresh'
        },
        basePrice: 1200,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 10
      }
    }),
    prisma.product.create({
      data: {
        name: 'Broiler Chicken',
        nameSwahili: 'Kuku wa Broiler',
        category: ProductCategory.CHICKEN,
        description: 'Freshly sourced broiler chicken, 1-1.2kg, hygienically handled',
        descriptionSwahili: 'Kuku wa broiler safi, 1-1.2kg',
        attributes: {
          chickenType: 'WHOLE',
          breed: 'Broiler',
          weight: '1-1.2kg',
          prepType: 'Fresh'
        },
        basePrice: 700,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 11
      }
    }),
  ]);

  console.log(`Created ${chickenProducts.length} chicken products`);

  // =============== VEGETABLES — Add-Ons ===============
  const vegetableProducts = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Sukuma Wiki (Kale)',
        nameSwahili: 'Sukuma Wiki',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh kale bunch, locally grown',
        descriptionSwahili: 'Sukuma wiki safi',
        attributes: { vegetableType: 'LEAFY', unit: 'bunch' },
        basePrice: 60,
        unit: 'per bunch',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 30
      }
    }),
    prisma.product.create({
      data: {
        name: 'Spinach',
        nameSwahili: 'Mchicha',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh spinach bunch',
        descriptionSwahili: 'Mchicha safi',
        attributes: { vegetableType: 'LEAFY', unit: 'bunch' },
        basePrice: 60,
        unit: 'per bunch',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 31
      }
    }),
    prisma.product.create({
      data: {
        name: 'Cabbage',
        nameSwahili: 'Kabichi',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh whole cabbage',
        descriptionSwahili: 'Kabichi mzima safi',
        attributes: { vegetableType: 'LEAFY', unit: 'whole' },
        basePrice: 100,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 32
      }
    }),
    prisma.product.create({
      data: {
        name: 'Osuga/Managu',
        nameSwahili: 'Osuga/Managu',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh traditional vegetable bundle',
        descriptionSwahili: 'Mboga za kienyeji safi',
        attributes: { vegetableType: 'LEAFY', unit: 'bundle' },
        basePrice: 60,
        unit: 'per bundle',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 33
      }
    }),
    prisma.product.create({
      data: {
        name: 'Irish Potatoes',
        nameSwahili: 'Viazi',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh Irish potatoes',
        descriptionSwahili: 'Viazi safi',
        attributes: { vegetableType: 'ROOT' },
        basePrice: 140,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 34
      }
    }),
    prisma.product.create({
      data: {
        name: 'Capsicum (Bell Pepper)',
        nameSwahili: 'Pilipili Hoho',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh bell pepper',
        descriptionSwahili: 'Pilipili hoho safi',
        attributes: { vegetableType: 'OTHER' },
        basePrice: 60,
        unit: 'per piece',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 35
      }
    }),
    prisma.product.create({
      data: {
        name: 'White Onions',
        nameSwahili: 'Vitunguu Nyeupe',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh white onions',
        descriptionSwahili: 'Vitunguu nyeupe safi',
        attributes: { vegetableType: 'OTHER', color: 'white' },
        basePrice: 120,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 36
      }
    }),
    prisma.product.create({
      data: {
        name: 'Red Onions',
        nameSwahili: 'Vitunguu Nyekundu',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh red onions',
        descriptionSwahili: 'Vitunguu nyekundu safi',
        attributes: { vegetableType: 'OTHER', color: 'red' },
        basePrice: 110,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 37
      }
    }),
    prisma.product.create({
      data: {
        name: 'Sweet Potatoes',
        nameSwahili: 'Viazi Vitamu',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh sweet potatoes',
        descriptionSwahili: 'Viazi vitamu safi',
        attributes: { vegetableType: 'ROOT' },
        basePrice: 100,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 38
      }
    }),
    prisma.product.create({
      data: {
        name: 'Tomatoes',
        nameSwahili: 'Nyanya',
        category: ProductCategory.VEGETABLES,
        description: 'Fresh ripe tomatoes',
        descriptionSwahili: 'Nyanya safi',
        attributes: { vegetableType: 'OTHER' },
        basePrice: 120,
        unit: 'per kg',
        availability: AvailabilityStatus.IN_STOCK,
        displayOrder: 39
      }
    }),
  ]);

  console.log(`Created ${vegetableProducts.length} vegetable products`);

  // =============== PRODUCT RECOMMENDATIONS ===============
  const recommendations = await Promise.all([
    // Fish + Vegetables
    prisma.productRecommendation.create({
      data: {
        productId: fishProducts[0].id, // Tilapia
        recommendedId: vegetableProducts[0].id, // Sukuma Wiki
        strength: 5.0
      }
    }),
    prisma.productRecommendation.create({
      data: {
        productId: fishProducts[0].id, // Tilapia
        recommendedId: vegetableProducts[7].id, // Red Onions
        strength: 4.5
      }
    }),
    prisma.productRecommendation.create({
      data: {
        productId: fishProducts[1].id, // Nile Perch
        recommendedId: vegetableProducts[4].id, // Irish Potatoes
        strength: 5.0
      }
    }),
    // Chicken + Vegetables
    prisma.productRecommendation.create({
      data: {
        productId: chickenProducts[0].id, // Kienyeji
        recommendedId: vegetableProducts[4].id, // Irish Potatoes
        strength: 5.0
      }
    }),
    prisma.productRecommendation.create({
      data: {
        productId: chickenProducts[1].id, // Broiler
        recommendedId: vegetableProducts[0].id, // Sukuma Wiki
        strength: 4.5
      }
    }),
    prisma.productRecommendation.create({
      data: {
        productId: chickenProducts[1].id, // Broiler
        recommendedId: vegetableProducts[5].id, // Capsicum
        strength: 4.0
      }
    }),
  ]);

  console.log(`Created ${recommendations.length} product recommendations`);

  console.log('\nDatabase seed completed successfully!');
  console.log(`\nSummary:`);
  console.log(`- ${fishProducts.length} fish products (free delivery anchors)`);
  console.log(`- ${chickenProducts.length} chicken products (free delivery anchors)`);
  console.log(`- ${vegetableProducts.length} vegetable add-ons`);
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
