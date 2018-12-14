# Latin prose/verse classification with RF classifier and full feature set
# Requires sklearn version 0.19 or earlier

# Load preprossing packages
from sklearn import preprocessing
from sklearn.utils import shuffle

# Load pandas and numpy
import pandas as pd
import numpy as np

# Load scikit-learn implementation of RF
from sklearn.ensemble import RandomForestClassifier

# Load packages for cross-validation
from sklearn import cross_validation
from sklearn.cross_validation import cross_val_score, cross_val_predict
from sklearn import model_selection
from sklearn import metrics

# Seed random number generator so that identical results will be generated each time
np.random.seed(0)

# Load data
df0 = pd.read_csv("stylometry_data_final.csv")

# Shuffle the order of the texts
df = shuffle(df0, random_state=1)

# Matrices of feature values (X) and prose/verse labels (Y)
array = df.values
X = array[:,0:26]
Y = array[:,30]
features = df.columns[0:26]

# Rescale data so that min is 0 and max is 1
min_max_scaler = preprocessing.MinMaxScaler()
X_scaled = min_max_scaler.fit_transform(X)

# Load Apocolocyntosis data
dfA = pd.read_csv("apocolocyntosis_split.csv")
arrayA = dfA.values
XA = arrayA[:,0:26]
XA_scaled = min_max_scaler.fit_transform(XA)

# Train classifier on full dataset
clf = RandomForestClassifier(n_jobs=-1, n_estimators=250, min_samples_leaf=10)
clf.fit(X_scaled, Y)

# Use trained classifier to predict genre of Apocolocyntosis partitions
results = clf.predict(XA_scaled)

# Print predicted labels
df_predictions = pd.DataFrame(results)
dfA_names = dfA[['Corpus Name', 'Type']]
output = np.concatenate([dfA_names, df_predictions], axis=1)
df_output = pd.DataFrame(output)
filepath2 = 'predicted_labels.xlsx'
df_output.to_excel(filepath2, index=False, header=False)












