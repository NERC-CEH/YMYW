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

> [Example 1. Zurich](https://github.com/NERC-CEH/YMYW/blob/main/Examples/Zurich.js)
>
> This example (link above) present the geometries (Multipolygons) and parameters use to classify the Sentinel-2 images and produce land cover map for the region (AOI) around Zurich (Switzerland). 
>
> - Uses satellite images collection "COPERNICUS/S2_SR" - [Sentinel-2 MSI: MultiSpectral Instrument, Level-2A](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR#:~:text=Sentinel%2D2%20is%20a%20wide,data%20are%20downloaded%20from%20scihub.)
> 
> - Aims to classify Land Cover of year 2020 (start date: '2020-01-01')
> 
> - Divides the year into five periods (seasons) '0,3:3,5:5,7:7,9:9,11'
>   - Period 1 = [2020-01-01 - 2020-04-01] (3 months)
>   - Period 2 = [2020-04-01 - 2020-06-01] (2 months)
>   - Period 3 = [2020-06-01 - 2020-08-01] (2 months)
>   - Period 4 = [2020-08-01 - 2020-10-01] (2 months)
>   - Period 5 = [2020-11-01 - 2020-12-01] (2 months)
>    
> - Contains 10 land cover classes in the thematic map.
>   - CL1 = Water
>   - CL2 = Arable
>   - CL3 = Forest Conifer
>   - CL4 = Forest Deciduous
>   - CL5 = Wetland
>   - CL6 = Meadow Hay
>   - CL7 = Meadow Wet
>   - CL8 = Meadow Mountain
>   - CL9 = Quarry
>   - CL10 = Urban
>
> 1. Copy the code in [Example/Zurich.js](https://github.com/NERC-CEH/YMYW/blob/main/Examples/Zurich.js)  
> 2. Paste the Zurich code in the GEE editor.  
> 3. Hover over the code with the mouse and press "convert" in the yellow box to convert the records into training polygons for this example.  
> 4. Copy the YMYW code in [YMYW.js](https://github.com/NERC-CEH/YMYW/blob/main/YMYW.js)   
> 5. Paste the YMYW code below the block entitled **"// ### YMYW Code Below >>>"** (line 33 in GEE editor).   
> 6. Press "Run" (run script) at the top of the GEE editor.   
> 7. On interactive GUI panel that appears on the left hand side, examine that parameter that will be used to select the satellite images, define the year and the time periods to create the composite images.   
> 8. On the GUI panel, press "Show Composites" and select them from the layers menu (top-right side of the map); Examine the 5 seasonal layers.   
> 9. On the GUI panel, press "Classify" to the Random Forest classifier and classify the AOI (blue square). this can take some time (don't worry if you see the message "Page Unresponsive).     
> 10. Once completed, the Land Cover legend will appear on the bottom-righ of your screen and the classification will be rendered. You can select or deselect the the classification from the layers menu.   
> 11. On the GUI menu, you can now explore the "Out of bag error" and the "Variable importance" statistics for the Random Forest model.   
> 12. On the GUI menu, press "Validate classification" to compute the confusion matrix and Omisssion and Comission errors.   
> 13. Examine the outputs (i.e. confusion matrix, etc) from the GEE console (top-right panel, next to the editor).   
> 14. Press "Export classification and more" to export the classification map, the training data and validation data, and more to Google drive or Google cloud. One you pressed the Export button, see "Tasks" tab in the top-right panel (tab should be orange now). Run and follow instruction to launch the export.   
>   - layers = polygons (KML) draw for to inform the classification;
>   - trainingPoints = points (KML) used to train the Random Forest classifier;
>   - validationPoints = points (KML) used to validate the classification (cross-validation);
>   - ErrorMatrix = Confusion matrix (CSV) from the cross-validation;
>   - classified_aoi = Classified map (GeoTIFF) of the Area of Interest;
>   - composite_aoi = Composite image (GeoTIFF) with the bands for each time period and the terrain layers (elevation, slope, aspect).
> 
---

> [Example 2. xx ](https://github.com/NERC-CEH/YMYW/blob/main/Examples/xx.js)]
>
> xx

### Funding
The development of the YMYW tool was initially funded by UKRI's Latin American Biodiversity Programme through the project [SURPASS2](https://bee-surpass.org/about/) which concerned safeguarding of pollination services. We developed YMYW to enable local ecologists to produce bespoke habitat maps for pollination models and analyses. YMWY receives ongoing support through [SABIOMA](https://sabioma.org) and [UKRI’s National Capability funding](https://www.ukri.org/councils/nerc/guidance-for-applicants/types-of-funding-we-offer/national-capability-funding/).

### Credits
Daniel Morton (DM) developed the first iteration of YMWY and Reto Schmucki (RS) implemented revisions and enhancements. DM and RS will continue to develop and enhance the YMYW distribution. YMYW encapsulates collective ideas and knowledge from past and present UKCEH Land Cover team members, primarily Daniel Morton, Clare Rowland, Chris Marston and Luis Carassco.


