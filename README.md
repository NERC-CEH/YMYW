## Your Maps Your Way (YMYW)

### Background

YMYW is an interactive Google Earth Engine application. It is designed to allow users with only basic knowledge of satellite imagery and supervised learning techniques to create detailed habitat/land cover maps anywhere in the world with a thematic structure chosen by the user; hence Your Maps, Your Way. The current version of YMYW allows the classification of optical Sentinel-2 and Landsat Images, but advanced users will find it straightforward to adapt the code to other available image collections. The development of YMYW began during the COVID-19 pandemic (2020-2021). It allowed us to collaborate with local ecologists in South America (Argentina, Brazil and Chile) to produce bespoke habitat maps for pollination modelling and analysis. Throughout the development of YMYW, our goal was to provide an intuitive and user-friendly interface to facilitate collaboration, support local experts and encourage knowledge exchange between groups. When using YMYW, users can harness the computing power of Google's Earth Engine and integrate essential local knowledge to create high-quality land cover maps.  

### In a Nutshell
- Before you start with YMYW, you need to Sign Up and get access to [Google's Earth Engine (GEE)](https://earthengine.google.com/). 
- In GEE, you can paste the [java script of YMYW](https://github.com/NERC-CEH/YMYW/blob/main/YMYW.js) in the GEE editor. You can also access the code directly through this [link](xx).

> ### *Your Maps Your Way in 10 steps* 
> 1. Draw the area of interest (AOI) and specify the period or year of interest.
> 2. Select the collection of satellite images to classify (Sentinel-2 or Landsat).
> 3. Define the periods (date and months) that capture change and phenology of the land cover in the region of interest.
> 4. Visualise the composite images; adjust cloud tolerance and period if necessary.
> 5. Digitise training objects for specific land cover classes.
> 6. Launch a random forest classifier to classify each pixel of the area of interest (AOI).
> 7. Cross-Validate the classification and assess its accuracy.
> 8. Digitise additional training objects for misclassified land cover and areas.
> 9. Reiterate steps 6 to 8 until satisfactory classification is achieved (revisit step 3 if necessary).  
> 10. Export the results: land cover map the training dataset, the validation dataset

Classification with YMYW is a heuristic, iterative process. Training objects can be added and removed at each iteration until the classification converges to the optimal result. The training objects are digitised using online image collections as base maps and the users' local knowledge of the area of interest. YMYW uses a supervised machine learning algorithm (Random Forests) that "learns and improves" mainly when its supervisor identifies where it makes mistakes (misclassification). In most cases, and with some practice, YMYW will produce a high-quality land cover/habitat map in a few iterations.

### Example
To illustrate the use of YMYW, we provide two examples with digitised training data that produce a land cover map for 1) an area of interest near Zurich (Switzerland) and 2) an area of interest near Lancaster (UK).

> [Example 1. Zurich](https://github.com/NERC-CEH/YMYW/blob/main/YMYW_ZurichExample.js)
>
> This example (link above) present the geometries (Multipolygons) and parameters use to classify the Sentinel-2 images and produce land cover map for the regions around Zurich. The map characterise 10 land cover classes.

> [Example 2. xx ](https://github.com/NERC-CEH/YMYW/blob/main/xx.js)]
>
> xx

### Funding
The development of the YMYW tool was initially funded by UKRI's Latin American Biodiversity Programme through the project [SURPASS2](https://bee-surpass.org/about/) which concerned safeguarding of pollination services. We developed YMYW to enable local ecologists to produce bespoke habitat maps for pollination models and analyses. YMWY receives ongoing support through [SABIOMA](https://sabioma.org) and [UKRI’s National Capability funding](https://www.ukri.org/councils/nerc/guidance-for-applicants/types-of-funding-we-offer/national-capability-funding/).

### Credits
Daniel Morton (DM) developed the first iteration of YMWY and Reto Schmucki (RS) implemented revisions and enhancements. DM and RS will continue to develop and enhance the YMYW distribution. YMYW encapsulates collective ideas and knowledge from past and present UKCEH Land Cover team members, primarily Daniel Morton, Clare Rowland, Chris Marston and Luis Carassco.


