# Your Maps Your Way (YMYW)
[![DOI](https://zenodo.org/badge/590093715.svg)](https://zenodo.org/badge/latestdoi/590093715)

## Background

YMYW is an interactive Google Earth Engine application. It is designed to allow users with only basic knowledge of satellite imagery and supervised learning techniques to create detailed habitat/land cover maps anywhere in the world with a thematic structure chosen by the user (*Your Maps, Your Way*). The current version of YMYW allows the classification of optical Sentinel-2 and Landsat imagery, but advanced users will find it straightforward to adapt the code to other available image collections. The development of YMYW began during the COVID-19 pandemic (2020-2021). It allowed us to engage and collaborate with local ecologists in South America (Argentina, Brazil and Chile) to create customised habitat maps for pollination modelling and analysis. Throughout the development of YMYW, our goal was to provide an intuitive and user-friendly interface to facilitate collaboration, support local experts and promote knowledge exchange between groups. When using YMYW, users can harness the computing power of Google's Earth Engine and integrate essential local knowledge to create high-quality land cover maps.

## How to cite this material
Morton, R.D., & Schmucki, R. (2023). YMYW - Your Maps Your Way with Google Earth Engine (Version 1.0.0) [Computer software]. https://doi.org/10.5281/zenodo.7624622

## In a Nutshell
- Before you start with YMYW, you need to Sign Up and get access to [Google's Earth Engine (GEE)](https://earthengine.google.com/). 
- In GEE, you can paste the [JavaScript of YMYW](https://github.com/NERC-CEH/YMYW/blob/main/YMYW.js) into a new file in the GEE editor.

> ### *Your Maps Your Way in 10 steps* 
> 1. Draw the Area of Interest (AOI) and press the "Run" button.
> 2. Select the collection of satellite images to be classified (Sentinel-2 or Landsat).
> 3. Define the year and the time periods (dates and months) that capture the land cover changes and phenology in the region of interest.
> 4. Press the "Show composites" button to visualise the composite images; adjust cloud tolerance and time period as needed.
> 5. Digitise training objects for specific land cover classes, using composite layers, the Google satellite layer, or other sources of information. To improve cross-validation, aim to draw many small training objects distributed across the AOI.
> 6. Press the "Classify" button to run a random forest classifier to classify each pixel of the Area of Interest (AOI).
> 7. Press the "Validate classification" button to cross-Validate the classification and evaluate its accuracy.
> 8. Digitise additional training objects for misclassified land covers and areas.
> 9. Repeat steps 6 to 8 until a satisfactory classification is achieved (go back to step 3 if necessary).  
> 10. Press the "Export classification and more" button to export the results: the land cover map the training dataset, the validation dataset. Export appears under the "Task" tab. Press "RUN" and fill the export details to initiate the specific export.  
>### See the sequence of [screenshots](https://github.com/NERC-CEH/YMYW/blob/main/Documentation/YourMapsYourWayDoc.pdf)  

Classification with YMYW is a heuristic, iterative process. At each iteration, training objects can be added and/or removed until the classification converges to an optimal result. The training objects are digitised using online image collections as base maps and the user's local knowledge of the area of interest. YMYW uses a supervised machine learning algorithm (Random Forests) that "learns and improves" mainly when its supervisor identifies where it makes mistakes (misclassification). In most cases, and with some practice, YMYW will produce a high-quality land cover/habitat map in a few iterations. 

YMYW allows the user to select and define the thematic structure of the classification used for land cover mapping. While this gives freedom to the user, we would also like to emphasise the importance of adopting a consistent and systematic approach when defining land cover classes (e.g., [FAO Land Cover Classification System (LCCS)](https://www.fao.org/land-water/land/land-governance/land-resources-planning-toolbox/category/details/en/c/1036361/)).


## Examples
To illustrate the use of YMYW, we provide two examples of digitised training data to produce a land cover map for 1) an area of interest near Zurich (Switzerland) and 2) an area of interest around the Leven Estuary near Ulverston (UK).


>[**Example 1. Zurich**](https://github.com/NERC-CEH/YMYW/blob/main/Examples/Zurich_example.md)
>
> This example (link above) contains the geometries (multipolygons) and parameters used to classify the Sentinel-2 images and create a land cover map for the region (AOI) around Zurich (Switzerland) using 10 land cover classes.
>
>
> [**Example 2. Ulverston & Leven Estuary**](https://github.com/NERC-CEH/YMYW/blob/main/Examples/Ulverston_LevenEstuary_exmple.md)
>
> This example (link above) contains the geometries (multipolygons) and parameters used to classify the Sentinel-2 images and create a land cover map for the region (AOI) around the Leven Estuary near Ulverston (UK) using 13 land cover classes.
>

## Funding
The development of the YMYW tool was funded by the UKRI Natural Environment Research Council (NERC) through the Latin American Biodiversity Programme [Grant No. NE /S011870/2]. The project [SURPASS2](https://bee-surpass.org/about/) was concerned with the safeguarding of pollinators and pollination services in Latin America (Argentina, Brazil and Chile). In this context, we developed YMYW to enable local ecologists to produce bespoke habitat maps for pollination models and analyses. YMWY receives ongoing support from the [SABIOMA](https://sabioma.org) project and [UKRI’s National Capability funding](https://www.ukri.org/councils/nerc/guidance-for-applicants/types-of-funding-we-offer/national-capability-funding/).

## Credits
Daniel Morton (DM) developed the first iteration of YMWY and Reto Schmucki (RS) implemented revisions and enhancements. DM and RS will continue to develop and improve and extend the functionality of the YMYW distribution. YMYW incorporates the collective ideas and knowledge of past and present members of the UKCEH Land Cover Team, in particular Daniel Morton, Clare Rowland, Chris Marston and Luis Carassco.


