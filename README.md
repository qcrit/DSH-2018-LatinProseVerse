## Replication code for Chaudhuri et al., "A small set of stylometric features differentiates Latin prose and verse," forthcoming in Digital Scholarship in the Humanities

N.B.: The complete stylometric dataset is available as a single file ('stylometry_data_final.csv'). If you would like to run the classification experiments without regenerating the data, just skip to Step 2. Also, 'summary.xlsx' is a collation of most of the classification results in a single file, which may be a helpful reference. 

## Step 1: Generate input stylometric data

The stylometry code is written in JavaScript with the Meteor.js framework. It has the following npm dependencies: Handsontable.js, Chart.js, to-csv, and @knod/sbd. 

To run:

1) cd into the 'stylometry' directory. 
2) Install Meteor by typing `curl https://install.meteor.com/ | sh` in the terminal.
3) Type `meteor`. 
4) Open a browser and copy the address `http://localhost:3000` to load the stylometry interface. 

To generate dataset:

1) Click the 'Select All' box near the top left corner of the interface. 
2) Click 'Submit'. This will generate a table with stylometric data for all of the authors. 
3) Click 'Export Results' to download the complete dataset as a csv. 

To reproduce the results in the paper exactly, you will have to do two further pre-processing steps. (These have already been done for 'stylometry_data_final.csv'.) 

1) Delete rows 270 and 368, which contain data on Seneca's Apocolocyntosis.
2) Sort the texts so that they are in alphebetical order. 

## Step 2: Run the random forest classifier with the full feature set

The classification code is written in Python 2.7.10. It has the following dependencies: scipy, numpy, scikit-learn (must be v. 0.19 or earlier), pandas, and openpyxl. 

It is recommended that you create a virtual environment for this project before installing the required packages and running this code. If you have not done so previously, you will need to install virtualenv (e.g., by running `pip install virtualenv`). To create a virtual environment called 'venv_Latin_prose_verse', type `virtualenv Latin_prose_verse`. To activate the virtual environment, type `source venv_Latin_prose_verse/bin/activate` when in the main ('code') directory. 

Before running the replication experiments, install the five required packages (e.g., `pip install scikit-learn==0.19.1` for scikit-learn). 

To reproduce RF results:

1) cd into the 'RF_classification' directory. 
2) Type `python Latin_prose_verse_RF_classifier.py` in the terminal. 
3) Running the code will generate three Excel files as output. 

'accuracy_each_fold.xlsx' gives the classification accuracies for the five cross-validation folds (Table 3 in the main paper). 'rankings.xlsx' gives the feature rankings by Gini importance (Table 4). 'predicted_labels.xlsx' gives the true (column B) and predicted (column C) labels for each text in the corpus. 

## Step 3: Run the other classification experiments

The other classification experiments (SVM and RF with reduced feature sets) can be run in exactly the same way. Just cd into the appropriate directory and run the Python code there (e.g., 'Latin_prose_verse_RF_classifier_top10.py' in 'reduced_feature_sets/top10'). 

## Step 4: Run the Apocolocyntosis experiment

1) cd into the 'Apocolocyntosis' directory.
2) Type `python Latin_prose_verse_Apocolocyntosis.py` in the terminal.
3) Running the code will generate a single Excel file with the actual and predicted classifications ('predicted_labels.xlsx') as output. 



