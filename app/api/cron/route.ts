import Product from "@/lib/models/product.models";
import { connectToDB } from "@/lib/mongoose"
import { scrapeAmazonProduct } from "@/lib/scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "@/lib/utils";

export async function GET(){
    try {
        connectToDB();

        const products = await Product.find({});

        if(!products) throw new Error("No prodcuts found");

        // 1.SCRAPE LATEST PRODUCTS DETAILS & UPDATE DB

        const updatedProducts = await Promise.all(
            products.map(async(currentProduct)=>{
                const scrapedProduct = await  scrapeAmazonProduct(currentProduct.url);

                if(!scrapedProduct) throw new Error("No product found");

                const updatedPriceHistory= [
                    ...currentProduct.priceHistory,
                    { price: scrapedProduct.currentPrice }
                  ]
            
                 const product = {
                    ...scrapedProduct,
                    priceHistory: updatedPriceHistory,
                    lowestPrice: getLowestPrice(updatedPriceHistory),
                    highestPrice: getHighestPrice(updatedPriceHistory),
                    averagePrice: getAveragePrice(updatedPriceHistory),
                  }
                
            
                const updatedProduct = await Product.findOneAndUpdate(
                  { url: scrapedProduct.url },
                  product,
                  { upsert: true, new: true }
                );

                // 2. CHECK EACH PRODUCTS'S STATUS & SEND EMAIL ACCORDINGLY
                
            })

        )
    } catch (error) {
        throw new Error(`error in GET:${error}`)
    }
}