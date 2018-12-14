# Latin prose/verse classification with linear SVM classifier and full feature set
# Requires sklearn version 0.19 or earlier

# Load preprossing packages
from sklearn import preprocessing
from sklearn.utils import shuffle

# Load pandas and numpy
import pandas as pd
import numpy as np

# Load scikit-learn implementation of SVM
from sklearn import svm

# Load packages for cross-validation
from sklearn import cross_validation
from sklearn.cross_validation import cross_val_score, cross_val_predict
from sklearn import model_selection
from sklearn import metrics

# Seed random number generator so that cross-validation will yield identical results each time
np.random.seed(0)

# Old version
# Load data
#xl = pd.ExcelFile("final_data_June1.xlsx")
#df = xl.parse("final_data_June1")

# Load data
df0 = pd.read_csv("stylometry_data_final.csv")

# Shuffle the order of the texts
df = shuffle(df0, random_state=1)

# Old version
# Matrices of feature values (X) and prose/verse labels (Y)
#array = df.values
#X = array[:,0:26]
#Y = array[:,26]
#features = df.columns[0:26]

# Matrices of feature values (X) and prose/verse labels (Y)
array = df.values
X = array[:,0:26]
Y = array[:,30]
features = df.columns[0:26]

# Rescale data so that min is 0 and max is 1
min_max_scaler = preprocessing.MinMaxScaler()
X_scaled = min_max_scaler.fit_transform(X)

# 5-fold cross validation
# StratifiedKFold is used by default when cv is set to an integer value
clf = svm.SVC(kernel='linear',probability=True,C=0.5)
results = model_selection.cross_val_score(clf, X_scaled, Y, cv=5, scoring='accuracy')

# Print accuracies for each fold to file
df_results = pd.DataFrame(results)
filepath = 'accuracy_each_fold.xlsx'
df_results.to_excel(filepath, index=False, header=False)

# Old version
#predictions = np.matrix(list(zip(cross_val_predict(clf, X_scaled, Y, cv=5))))
#df_predictions = pd.DataFrame(predictions)
#df_names = df[['Corpus Name', 'category']]
#df_output = pd.concat([df_names, df_predictions], axis=1)
#filepath2 = 'predicted_labels.xlsx'
#df_output.to_excel(filepath2, index=False, header=False)

# Print predicted labels for each text to file
predictions = np.matrix(list(zip(cross_val_predict(clf, X_scaled, Y, cv=5))))
df_predictions = pd.DataFrame(predictions)
df_names = df[['Corpus Name', 'Type']]
output = np.concatenate([df_names, df_predictions], axis=1)
df_output = pd.DataFrame(output)
filepath2 = 'predicted_labels.xlsx'
df_output.to_excel(filepath2, index=False, header=False)

# Feature weights
clf.fit(X_scaled,Y)
weights = list(clf.coef_)
weights_output = np.matrix(sorted(list(zip(features, weights[0])), key=lambda x: x[1]))

df_rankings = pd.DataFrame(weights_output)
filepath3 = 'rankings.xlsx'
df_rankings.to_excel(filepath3, index=False, header=False)












