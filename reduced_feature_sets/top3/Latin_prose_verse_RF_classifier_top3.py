# Latin prose/verse classification with RF classifier and reduced feature sets
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

# Define subset of features (top 10)
# Uncomment below for top 5 and top 3
#array = df[['Quidam', 'Superlatives', 'Relative Clauses', 'Idem', 'Prepositions', 'Gerunds and Gerundives', 'Cum', 'Vocatives', 'Ut', 'Dum', 'Type']].values
#X = array[:,0:10]
#Y = array[:,10]
#features = df[['Quidam', 'Superlatives', 'Relative Clauses', 'Idem', 'Prepositions', 'Gerunds and Gerundives', 'Cum', 'Vocatives', 'Ut', 'Dum']].columns

# Define subset of features (top 5)
#array = df[['Quidam', 'Superlatives', 'Relative Clauses', 'Idem', 'Prepositions', 'Type']].values
#X = array[:,0:5]
#Y = array[:,5]
#features = df[['Quidam', 'Superlatives', 'Relative Clauses', 'Idem', 'Prepositions']].columns

# Define subset of features (top 3)
array = df[['Quidam', 'Superlatives', 'Relative Clauses', 'Type']].values
X = array[:,0:3]
Y = array[:,3]
features = df[['Quidam', 'Superlatives', 'Relative Clauses']].columns

# Rescale data so that min is 0 and max is 1
min_max_scaler = preprocessing.MinMaxScaler()
X_scaled = min_max_scaler.fit_transform(X)

# 5-fold cross validation
# StratifiedKFold is used by default when cv is set to an integer value
clf = RandomForestClassifier(n_jobs=-1, n_estimators=250, min_samples_leaf=10)
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

# Feature ranking by Gini importance
clf.fit(X,Y)
rankings = np.matrix(sorted(list(zip(features, clf.feature_importances_)), key=lambda x: x[1]))

# Print feature rankings to file
df_rankings = pd.DataFrame(rankings[::-1])
filepath3 = 'rankings.xlsx'
df_rankings.to_excel(filepath3, index=False, header=False)










